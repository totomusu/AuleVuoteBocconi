import { parseScheduleResponse, SOURCE_URL } from "./parser";
import type { ScheduleResponse, ScheduleSnapshot } from "./types";

const CACHE_KEY = "schedule:v1";
const STALE_AFTER_MS = 45 * 60 * 1000;

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function isSnapshot(value: unknown): value is ScheduleSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ScheduleSnapshot>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.scheduleDate === "string" &&
    typeof candidate.generatedAt === "string" &&
    Array.isArray(candidate.rooms) &&
    candidate.rooms.length > 0;
}

export function snapshotStatus(
  snapshot: ScheduleSnapshot,
  now = new Date(),
): "fresh" | "stale" {
  const generatedAt = Date.parse(snapshot.generatedAt);
  return Number.isFinite(generatedAt) &&
      now.getTime() - generatedAt <= STALE_AFTER_MS
    ? "fresh"
    : "stale";
}

export async function refreshSchedule(
  env: Env,
  now = new Date(),
): Promise<ScheduleSnapshot> {
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "AuleVuoteBocconi/2.0 (+https://github.com/totomusu/AuleVuoteBocconi)",
    },
  });
  if (!response.ok) {
    throw new Error(`Bocconi ha risposto con HTTP ${response.status}.`);
  }

  const snapshot = await parseScheduleResponse(response, now);
  await env.SCHEDULE_CACHE.put(CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

async function readSnapshot(env: Env): Promise<ScheduleSnapshot | null> {
  const value = await env.SCHEDULE_CACHE.get(CACHE_KEY, "json");
  return isSnapshot(value) ? value : null;
}

async function scheduleResponse(env: Env): Promise<Response> {
  let snapshot = await readSnapshot(env);
  if (!snapshot) {
    try {
      snapshot = await refreshSchedule(env);
    } catch (error) {
      console.error("Initial schedule refresh failed", error);
      return json({
        error: "schedule_unavailable",
        message: "Gli orari non sono temporaneamente disponibili. Riprova tra qualche minuto.",
      }, {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }
  }

  const payload: ScheduleResponse = {
    ...snapshot,
    status: snapshotStatus(snapshot),
  };
  return json(payload, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/schedule") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "method_not_allowed" }, {
          status: 405,
          headers: { allow: "GET, HEAD" },
        });
      }
      const response = await scheduleResponse(env);
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      refreshSchedule(env).catch((error) => {
        console.error("Scheduled refresh failed; keeping last-known-good data", error);
      }),
    );
  },
};

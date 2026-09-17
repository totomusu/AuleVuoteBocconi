import { describe, expect, it, vi } from "vitest";
import worker, { snapshotStatus } from "../src/index";
import type { ScheduleSnapshot } from "../src/types";

function snapshot(generatedAt: string): ScheduleSnapshot {
  return {
    schemaVersion: 1,
    scheduleDate: "2026-09-17",
    timezone: "Europe/Rome",
    generatedAt,
    source: "https://example.test",
    rooms: [{
      id: "sarfatti-25:aula-1",
      name: "Aula 1",
      buildingId: "sarfatti-25",
      buildingName: "Sarfatti 25",
      floor: "Piano terra",
      opening: { open: true, start: "08:00", end: "21:00" },
      intervals: [],
    }],
  };
}

function envWith(value: ScheduleSnapshot | null): Env {
  return {
    SCHEDULE_CACHE: {
      get: vi.fn(async () => value),
      put: vi.fn(async () => undefined),
    } as unknown as KVNamespace,
    ASSETS: { fetch: vi.fn(async () => new Response("asset")) } as unknown as Fetcher,
  };
}

describe("Worker API", () => {
  it("classifies fresh and stale snapshots", () => {
    const now = new Date("2026-09-17T12:00:00Z");
    expect(snapshotStatus(snapshot("2026-09-17T11:30:00Z"), now)).toBe("fresh");
    expect(snapshotStatus(snapshot("2026-09-17T10:00:00Z"), now)).toBe("stale");
  });

  it("serves cached data and rejects writes", async () => {
    const env = envWith(snapshot(new Date().toISOString()));
    const response = await worker.fetch(new Request("https://example.test/api/schedule"), env);
    expect(response.status).toBe(200);
    expect((await response.json() as { status: string }).status).toBe("fresh");

    const post = await worker.fetch(new Request("https://example.test/api/schedule", { method: "POST" }), env);
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
  });

  it("returns 503 when KV is empty and the upstream fails", async () => {
    const env = envWith(null);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream error", { status: 500 })));
    const response = await worker.fetch(new Request("https://example.test/api/schedule"), env);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "schedule_unavailable" });
    vi.unstubAllGlobals();
  });
});

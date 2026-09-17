import { BUILDINGS, ROOM_CATALOG, openingHoursFor, roomId } from "./catalog";
import type {
  BuildingId,
  RoomDefinition,
  ScheduleInterval,
  ScheduleSnapshot,
} from "./types";

export const SOURCE_URL = "https://didattica.unibocconi.it/aule/lista_orario.php";

interface SourceRow {
  date: string;
  start: string;
  end: string;
  description: string;
  rooms: string;
}

interface EndTagElement {
  onEndTag(callback: () => void): void;
}

class TableCollector {
  readonly rows: string[][] = [];
  private currentRow: string[] | null = null;
  private currentCell: string[] | null = null;

  startRow(element: EndTagElement): void {
    this.currentRow = [];
    element.onEndTag(() => {
      if (this.currentRow) this.rows.push(this.currentRow);
      this.currentRow = null;
      this.currentCell = null;
    });
  }

  startCell(element: EndTagElement): void {
    if (!this.currentRow) return;
    this.currentCell = [];
    element.onEndTag(() => {
      if (this.currentRow && this.currentCell) {
        this.currentRow.push(this.currentCell.join(""));
      }
      this.currentCell = null;
    });
  }

  text(value: string): void {
    this.currentCell?.push(value);
  }

  lineBreak(): void {
    this.currentCell?.push("\n");
  }
}

function cleanText(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string): string | null {
  const match = cleanText(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function normalizeTime(value: string): string | null {
  const match = cleanText(value).match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeRoomName(value: string): string {
  const normalized = cleanText(value).replace(/^aul[ae]\s+/i, "Aula ");
  const suffix = normalized.slice(5);
  if (/^n\d+$/i.test(suffix)) return `Aula ${suffix.toUpperCase()}`;
  if (/^u\d/i.test(suffix)) {
    return `Aula ${suffix.toUpperCase().replace("-LAB", "-Lab")}`;
  }
  if (/^\d+[a-z]$/i.test(suffix)) {
    return `Aula ${suffix.slice(0, -1)}${suffix.slice(-1).toLowerCase()}`;
  }
  return `Aula ${suffix}`;
}

function parseRoom(value: string): RoomDefinition | null {
  const segment = cleanText(value);
  const lower = segment.toLowerCase();
  let buildingId: BuildingId | null = null;
  if (lower.includes("sarfatti 25")) buildingId = "sarfatti-25";
  if (/sraffa\s*13/.test(lower)) buildingId = "sraffa-13";
  if (!buildingId) return null;

  const [rawName] = segment.split(",");
  if (!/^aul[ae]\s+/i.test(rawName)) return null;
  const name = normalizeRoomName(rawName);
  const floorMatch = segment.match(/piano\s+([^,;]+)/i);
  const floor = floorMatch ? `Piano ${cleanText(floorMatch[1])}` : "Piano non indicato";

  return {
    id: roomId(buildingId, name),
    name,
    buildingId,
    buildingName: BUILDINGS[buildingId].name,
    floor,
  };
}

function splitRooms(value: string): RoomDefinition[] {
  const seen = new Set<string>();
  return value
    .split(/\s*;\s*/)
    .map(parseRoom)
    .filter((room): room is RoomDefinition => {
      if (!room || seen.has(room.id)) return false;
      seen.add(room.id);
      return true;
    });
}

function sourceRows(rows: string[][]): SourceRow[] {
  return rows.flatMap((columns) => {
    if (columns.length !== 8) return [];
    const date = parseDate(columns[0]);
    const start = normalizeTime(columns[1]);
    const end = normalizeTime(columns[2]);
    if (!date || !start || !end || start >= end) return [];
    return [{
      date,
      start,
      end,
      description: cleanText(columns[5]),
      rooms: cleanText(columns[7]),
    }];
  });
}

function isOfficialStudy(description: string): boolean {
  return /\baul[ae]\s+studio\b/i.test(description);
}

function buildSnapshot(rows: SourceRow[], generatedAt: Date): ScheduleSnapshot {
  if (rows.length === 0) {
    throw new Error("La pagina Bocconi non contiene righe di orario valide.");
  }
  const scheduleDate = rows[0].date;
  const dayRows = rows.filter((row) => row.date === scheduleDate);
  const roomMap = new Map<string, RoomDefinition>(
    ROOM_CATALOG.map((item) => [item.id, { ...item }]),
  );
  const intervalMap = new Map<string, ScheduleInterval[]>();

  for (const row of dayRows) {
    const kind = isOfficialStudy(row.description) ? "official-study" : "busy";
    const label = kind === "official-study"
      ? "Aule studio"
      : row.description || "Attività programmata";
    for (const parsedRoom of splitRooms(row.rooms)) {
      if (!roomMap.has(parsedRoom.id)) roomMap.set(parsedRoom.id, parsedRoom);
      const intervals = intervalMap.get(parsedRoom.id) ?? [];
      const interval: ScheduleInterval = {
        start: row.start,
        end: row.end,
        kind,
        label,
      };
      if (!intervals.some((item) =>
        item.start === interval.start &&
        item.end === interval.end &&
        item.kind === interval.kind &&
        item.label === interval.label
      )) intervals.push(interval);
      intervalMap.set(parsedRoom.id, intervals);
    }
  }

  const rooms = [...roomMap.values()]
    .map((definition) => ({
      ...definition,
      opening: openingHoursFor(definition.buildingId, scheduleDate),
      intervals: (intervalMap.get(definition.id) ?? []).sort((a, b) =>
        a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
      ),
    }))
    .sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName, "it", { numeric: true }) ||
      a.name.localeCompare(b.name, "it", { numeric: true }),
    );

  return {
    schemaVersion: 1,
    scheduleDate,
    timezone: "Europe/Rome",
    generatedAt: generatedAt.toISOString(),
    source: SOURCE_URL,
    rooms,
  };
}

export async function collectTableRows(response: Response): Promise<string[][]> {
  const collector = new TableCollector();
  const transformed = new HTMLRewriter()
    .on("table tr", {
      element(element) {
        collector.startRow(element);
      },
    })
    .on("table tr td", {
      element(element) {
        collector.startCell(element);
      },
      text(chunk) {
        collector.text(chunk.text);
      },
    })
    .on("table tr td br", {
      element() {
        collector.lineBreak();
      },
    })
    .transform(response);

  await transformed.arrayBuffer();
  return collector.rows;
}

export async function parseScheduleResponse(
  response: Response,
  generatedAt = new Date(),
): Promise<ScheduleSnapshot> {
  return buildSnapshot(sourceRows(await collectTableRows(response)), generatedAt);
}

export function parseScheduleHtml(
  html: string,
  generatedAt = new Date(),
): Promise<ScheduleSnapshot> {
  return parseScheduleResponse(
    new Response(html, { headers: { "content-type": "text/html; charset=UTF-8" } }),
    generatedAt,
  );
}

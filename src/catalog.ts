import type { BuildingId, OpeningHours, RoomDefinition } from "./types";

export const BUILDINGS = {
  "sarfatti-25": {
    name: "Sarfatti 25",
    weekday: { start: "08:00", end: "21:00" },
    saturday: { start: "08:00", end: "18:00" },
  },
  "sraffa-13": {
    name: "Sraffa 13",
    weekday: { start: "08:30", end: "20:30" },
    saturday: null,
  },
} as const;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function roomId(buildingId: BuildingId, name: string): string {
  return `${buildingId}:${slugify(name)}`;
}

function room(buildingId: BuildingId, name: string, floor: string): RoomDefinition {
  return {
    id: roomId(buildingId, name),
    name,
    buildingId,
    buildingName: BUILDINGS[buildingId].name,
    floor,
  };
}

function numberedRooms(
  buildingId: BuildingId,
  values: Array<number | string>,
  floor: string,
  prefix = "Aula ",
): RoomDefinition[] {
  return values.map((value) => room(buildingId, `${prefix}${value}`, floor));
}

function range(from: number, to: number, pad = 0): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) =>
    String(from + index).padStart(pad, "0"),
  );
}

const sarfattiRooms: RoomDefinition[] = [
  ...numberedRooms("sarfatti-25", range(1, 5), "Piano terra"),
  ...numberedRooms("sarfatti-25", ["A", "B", "C", "D", "E", "F"], "Piano terra"),
  room("sarfatti-25", "Aula Notari", "Piano terra"),
  room("sarfatti-25", "Aula Zappa", "Piano terra"),
  ...numberedRooms("sarfatti-25", [...range(11, 16), "101"], "Piano 1"),
  room("sarfatti-25", "Aula Manfredini", "Piano 1"),
  room("sarfatti-25", "Aula Perego", "Piano 1"),
  ...numberedRooms("sarfatti-25", [...range(21, 26), ...range(201, 205)], "Piano 2"),
  room("sarfatti-25", "Aula Franceschi", "Piano 2"),
  ...numberedRooms("sarfatti-25", [...range(31, 36), "301", "302"], "Piano 3"),
  ...numberedRooms("sarfatti-25", [...range(41, 44), "4a", "4b", "4c"], "Piano 4"),
  ...numberedRooms("sarfatti-25", ["U02", "U03-Lab"], "Piano seminterrato"),
];

const sraffaRooms: RoomDefinition[] = [
  ...numberedRooms("sraffa-13", range(1, 8, 2), "Piano terra", "Aula N"),
  ...numberedRooms("sraffa-13", range(10, 19), "Piano 1", "Aula N"),
  ...numberedRooms("sraffa-13", range(20, 29), "Piano 2", "Aula N"),
  ...numberedRooms("sraffa-13", range(30, 39), "Piano 3", "Aula N"),
];

export const ROOM_CATALOG: readonly RoomDefinition[] = [...sarfattiRooms, ...sraffaRooms];

export function openingHoursFor(
  buildingId: BuildingId,
  scheduleDate: string,
): OpeningHours {
  const weekday = new Date(`${scheduleDate}T12:00:00Z`).getUTCDay();
  const building = BUILDINGS[buildingId];
  const hours = weekday === 0
    ? null
    : weekday === 6
      ? building.saturday
      : building.weekday;

  return hours
    ? { open: true, start: hours.start, end: hours.end }
    : { open: false, start: null, end: null };
}

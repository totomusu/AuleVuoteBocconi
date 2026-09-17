export type BuildingId = "sarfatti-25" | "sraffa-13";
export type IntervalKind = "busy" | "official-study";

export interface ScheduleInterval {
  start: string;
  end: string;
  kind: IntervalKind;
  label: string;
}

export interface OpeningHours {
  open: boolean;
  start: string | null;
  end: string | null;
}

export interface ScheduleRoom {
  id: string;
  name: string;
  buildingId: BuildingId;
  buildingName: string;
  floor: string;
  opening: OpeningHours;
  intervals: ScheduleInterval[];
}

export interface ScheduleSnapshot {
  schemaVersion: 1;
  scheduleDate: string;
  timezone: "Europe/Rome";
  generatedAt: string;
  source: string;
  rooms: ScheduleRoom[];
}

export interface ScheduleResponse extends ScheduleSnapshot {
  status: "fresh" | "stale";
}

export interface RoomDefinition {
  id: string;
  name: string;
  buildingId: BuildingId;
  buildingName: string;
  floor: string;
}

import { describe, expect, it } from "vitest";
import { findAvailableRooms, mergeIntervals, roomAvailability } from "../public/availability.js";

const baseRoom = {
  id: "sarfatti-25:aula-24",
  name: "Aula 24",
  buildingId: "sarfatti-25",
  buildingName: "Sarfatti 25",
  floor: "Piano 2",
  opening: { open: true, start: "08:00", end: "21:00" },
  intervals: [],
};

describe("availability calculation", () => {
  it("merges overlapping busy intervals without moving backwards", () => {
    expect(mergeIntervals([
      { start: "09:00", end: "12:00" },
      { start: "10:00", end: "11:00" },
      { start: "11:30", end: "13:00" },
    ])).toEqual([{ start: 540, end: 780 }]);
  });

  it("keeps an all-day empty room available until closing", () => {
    expect(roomAvailability(baseRoom, {
      mode: "now",
      start: "09:30",
      end: "09:30",
      minimumMinutes: 0,
    })).toMatchObject({ official: false, freeUntil: "21:00", remainingMinutes: 690 });
  });

  it("marks official study rooms but lets busy events win", () => {
    const room = {
      ...baseRoom,
      intervals: [
        { start: "09:00", end: "13:00", kind: "official-study", label: "Aule studio" },
        { start: "10:00", end: "11:00", kind: "busy", label: "Lezione" },
      ],
    };
    expect(roomAvailability(room, {
      mode: "now", start: "09:30", end: "09:30", minimumMinutes: 0,
    })?.official).toBe(true);
    expect(roomAvailability(room, {
      mode: "now", start: "10:30", end: "10:30", minimumMinutes: 0,
    })).toBeNull();
  });

  it("orders official rooms before longer ordinary availability", () => {
    const results = findAvailableRooms([
      { ...baseRoom, id: "free", name: "Aula 1" },
      {
        ...baseRoom,
        id: "official",
        name: "Aula 2",
        intervals: [{ start: "09:00", end: "10:00", kind: "official-study", label: "Aule studio" }],
      },
    ], { mode: "now", start: "09:30", end: "09:30", minimumMinutes: 0 });
    expect(results.map((result: { room: { id: string } }) => result.room.id))
      .toEqual(["official", "free"]);
  });

  it("requires the whole selected range to be free", () => {
    const room = {
      ...baseRoom,
      intervals: [{ start: "11:00", end: "12:00", kind: "busy", label: "Lezione" }],
    };
    expect(roomAvailability(room, {
      mode: "range", start: "10:30", end: "11:30", minimumMinutes: 0,
    })).toBeNull();
  });
});

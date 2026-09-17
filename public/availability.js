export function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mergeIntervals(intervals) {
  const sorted = intervals
    .map((interval) => ({
      start: timeToMinutes(interval.start),
      end: timeToMinutes(interval.end),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }
  return merged;
}

function overlaps(interval, start, end) {
  return timeToMinutes(interval.start) < end && timeToMinutes(interval.end) > start;
}

function coveredBy(intervals, start, end) {
  const merged = mergeIntervals(intervals);
  return merged.some((interval) => interval.start <= start && interval.end >= end);
}

export function roomAvailability(room, query) {
  if (!room.opening.open || !room.opening.start || !room.opening.end) return null;
  const opensAt = timeToMinutes(room.opening.start);
  const closesAt = timeToMinutes(room.opening.end);
  const start = timeToMinutes(query.start);
  const requestedEnd = query.mode === "range" ? timeToMinutes(query.end) : start + 1;
  if (start < opensAt || start >= closesAt || requestedEnd > closesAt || requestedEnd <= start) {
    return null;
  }

  const busy = room.intervals.filter((interval) => interval.kind === "busy");
  if (busy.some((interval) => overlaps(interval, start, requestedEnd))) return null;

  const mergedBusy = mergeIntervals(busy);
  const nextBusy = mergedBusy.find((interval) => interval.start >= requestedEnd);
  const freeUntil = Math.min(nextBusy?.start ?? closesAt, closesAt);
  const remainingMinutes = freeUntil - start;
  if (remainingMinutes < query.minimumMinutes) return null;

  const officialIntervals = room.intervals.filter((interval) => interval.kind === "official-study");
  const official = query.mode === "range"
    ? coveredBy(officialIntervals, start, requestedEnd)
    : officialIntervals.some((interval) => overlaps(interval, start, start + 1));

  return {
    room,
    official,
    freeUntil: minutesToTime(freeUntil),
    remainingMinutes,
    nextBusyAt: nextBusy ? minutesToTime(nextBusy.start) : null,
  };
}

export function findAvailableRooms(rooms, query) {
  return rooms
    .map((room) => roomAvailability(room, query))
    .filter(Boolean)
    .sort((a, b) =>
      Number(b.official) - Number(a.official) ||
      b.remainingMinutes - a.remainingMinutes ||
      a.room.name.localeCompare(b.room.name, "it", { numeric: true }),
    );
}

import { findAvailableRooms } from "/availability.js";

const translations = {
  it: {
    switchLanguage: "Switch to English",
    title: "Trova subito un’aula in cui studiare.",
    intro: "Aule marcate come \"Aule studio\" dalla Bocconi e aule senza attività programmate",
    searchLabel: "La tua ricerca",
    whenTitle: "Quando vuoi studiare?",
    refresh: "Ricarica dati",
    modeLabel: "Modalità di ricerca",
    now: "Adesso",
    range: "Scegli una fascia",
    minimumDuration: "Tempo minimo",
    anyDuration: "Qualsiasi durata",
    from: "Dalle",
    to: "Alle",
    roomSearch: "Cerca un’aula",
    roomPlaceholder: "Es. N24 o Aula 14",
    building: "Edificio",
    allBuildings: "Tutti gli edifici",
    floor: "Piano",
    allFloors: "Tutti i piani",
    officialLegend: "Aula studio",
    freeLegend: "Aula libera",
    availableNow: "Disponibili adesso",
    availableRange: "Disponibili dalle {start} alle {end}",
    roomsFound: "aule trovate",
    loadingRooms: "Cerco le aule disponibili…",
    errorTitle: "Non riesco a recuperare gli orari.",
    errorFallback: "Riprova tra qualche minuto.",
    retry: "Riprova",
    emptyTitle: "Nessuna aula corrisponde alla ricerca.",
    emptyCopy: "Prova a cambiare fascia oraria o a rimuovere un filtro.",
    disclaimer: "Servizio informativo indipendente, realizzato a scopo ricreativo. Non intende in alcun modo sostituirsi ai canali ufficiali forniti dall'Università Commerciale Luigi Bocconi",
    officialSource: "Orari ufficiali Bocconi ↗",
    staleNotice: "Gli ultimi dati disponibili non sono recenti. Le informazioni potrebbero essere cambiate.",
    dateMismatch: "Gli orari disponibili si riferiscono al {date}, non a oggi.",
    invalidRange: "L’orario finale deve essere successivo a quello iniziale.",
    officialBadge: "Aula studio",
    freeBadge: "Aula libera",
    freeNow: "Libera ora",
    freeRange: "Libera nella fascia scelta",
    until: "fino alle {time}",
    forDuration: "per {duration}",
    closesAt: "L’edificio chiude alle {time}",
    nextBusy: "Prossima attività alle {time}",
    noNextBusy: "Nessun’altra attività prevista",
    daySchedule: "Programma di oggi",
    noActivities: "Nessuna attività programmata",
    officialSlot: "Aula studio",
    busySlot: "Occupata",
    minutes: "{count} min",
    hours: "{hours} h",
    hoursMinutes: "{hours} h {minutes} min",
    scheduleDate: "Orari del {date}",
    groundFloor: "Piano terra",
    basementFloor: "Piano seminterrato",
    unknownFloor: "Piano non indicato",
  },
  en: {
    switchLanguage: "Passa a italiano",
    title: "Find a room to study in right now.",
    intro: "Rooms marked by Bocconi as \"Aule studio\" and classrooms without scheduled activities",
    searchLabel: "Your search",
    whenTitle: "When do you want to study?",
    refresh: "Refresh data",
    modeLabel: "Search mode",
    now: "Now",
    range: "Choose a time range",
    minimumDuration: "Minimum time",
    anyDuration: "Any duration",
    from: "From",
    to: "To",
    roomSearch: "Search for a room",
    roomPlaceholder: "E.g. N24 or Room 14",
    building: "Building",
    allBuildings: "All buildings",
    floor: "Floor",
    allFloors: "All floors",
    officialLegend: "Study room",
    freeLegend: "Available classroom",
    availableNow: "Available now",
    availableRange: "Available from {start} to {end}",
    roomsFound: "rooms found",
    loadingRooms: "Finding available rooms…",
    errorTitle: "I can’t retrieve the schedule.",
    errorFallback: "Try again in a few minutes.",
    retry: "Try again",
    emptyTitle: "No rooms match your search.",
    emptyCopy: "Try a different time range or remove a filter.",
    disclaimer: "Independent informational service, created for recreational purposes. It does not replace the official channels provided by Università Commerciale Luigi Bocconi.",
    officialSource: "Official Bocconi schedule ↗",
    staleNotice: "The latest available data is not recent. Information may have changed.",
    dateMismatch: "The available schedule is for {date}, not today.",
    invalidRange: "The end time must be later than the start time.",
    officialBadge: "Study room",
    freeBadge: "Available room",
    freeNow: "Available now",
    freeRange: "Available for the selected range",
    until: "until {time}",
    forDuration: "for {duration}",
    closesAt: "The building closes at {time}",
    nextBusy: "Next activity at {time}",
    noNextBusy: "No more activities scheduled",
    daySchedule: "Today’s schedule",
    noActivities: "No scheduled activities",
    officialSlot: "Study room",
    busySlot: "Occupied",
    minutes: "{count} min",
    hours: "{hours} hr",
    hoursMinutes: "{hours} hr {minutes} min",
    scheduleDate: "Schedule for {date}",
    groundFloor: "Ground floor",
    basementFloor: "Basement",
    unknownFloor: "Floor not specified",
  },
};

const elements = {
  languageButton: document.querySelector("#languageButton"),
  refreshButton: document.querySelector("#refreshButton"),
  retryButton: document.querySelector("#retryButton"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  nowControls: document.querySelector("#nowControls"),
  rangeControls: document.querySelector("#rangeControls"),
  minimumDuration: document.querySelector("#minimumDuration"),
  startTime: document.querySelector("#startTime"),
  endTime: document.querySelector("#endTime"),
  roomSearch: document.querySelector("#roomSearch"),
  buildingFilter: document.querySelector("#buildingFilter"),
  floorFilter: document.querySelector("#floorFilter"),
  querySummary: document.querySelector("#querySummary"),
  resultCount: document.querySelector("#resultCount"),
  scheduleDate: document.querySelector("#scheduleDate"),
  notice: document.querySelector("#notice"),
  loadingState: document.querySelector("#loadingState"),
  errorState: document.querySelector("#errorState"),
  errorMessage: document.querySelector("#errorMessage"),
  emptyState: document.querySelector("#emptyState"),
  roomGrid: document.querySelector("#roomGrid"),
};

const state = {
  language: navigator.language?.toLowerCase().startsWith("en") ? "en" : "it",
  mode: "now",
  schedule: null,
  loading: true,
  error: null,
};

function t(key, replacements = {}) {
  let value = translations[state.language][key] ?? key;
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
}

function romeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function addMinutes(value, amount) {
  const [hours, minutes] = value.split(":").map(Number);
  const result = Math.min(hours * 60 + minutes + amount, 23 * 60 + 59);
  return `${String(Math.floor(result / 60)).padStart(2, "0")}:${String(result % 60).padStart(2, "0")}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(state.language === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return t("minutes", { count: minutes });
  if (!minutes) return t("hours", { hours });
  return t("hoursMinutes", { hours, minutes });
}

function translateFloor(value) {
  if (/piano terra/i.test(value)) return t("groundFloor");
  if (/piano seminterrato/i.test(value)) return t("basementFloor");
  if (/non indicato/i.test(value)) return t("unknownFloor");
  if (state.language === "en") return value.replace(/Piano\s+/i, "Floor ");
  return value;
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.title = state.language === "it" ? "Aule libere Bocconi" : "Available rooms at Bocconi";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  elements.languageButton.textContent = t("switchLanguage");
  elements.languageButton.setAttribute("aria-label", t("switchLanguage"));
}

function currentQuery() {
  const now = romeParts();
  return state.mode === "now"
    ? {
        mode: "now",
        start: now.time,
        end: now.time,
        minimumMinutes: Number(elements.minimumDuration.value),
      }
    : {
        mode: "range",
        start: elements.startTime.value,
        end: elements.endTime.value,
        minimumMinutes: 0,
      };
}

function populateFloors() {
  const previous = elements.floorFilter.value;
  const rooms = state.schedule?.rooms ?? [];
  const selectedBuilding = elements.buildingFilter.value;
  const floors = [...new Set(rooms
    .filter((room) => !selectedBuilding || room.buildingId === selectedBuilding)
    .map((room) => room.floor))]
    .sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  elements.floorFilter.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = t("allFloors");
  elements.floorFilter.append(all);
  for (const floor of floors) {
    const option = document.createElement("option");
    option.value = floor;
    option.textContent = translateFloor(floor);
    elements.floorFilter.append(option);
  }
  if (floors.includes(previous)) elements.floorFilter.value = previous;
}

function createTimeline(room) {
  const list = document.createElement("ul");
  list.className = "timeline";
  if (!room.intervals.length) {
    const item = document.createElement("li");
    item.textContent = t("noActivities");
    list.append(item);
    return list;
  }
  for (const interval of room.intervals) {
    const item = document.createElement("li");
    if (interval.kind === "official-study") item.className = "official";
    const time = document.createElement("span");
    time.className = "timeline-time";
    time.textContent = `${interval.start}–${interval.end}`;
    const label = document.createElement("span");
    label.className = "timeline-label";
    label.textContent = interval.kind === "official-study" ? t("officialSlot") : interval.label || t("busySlot");
    item.append(time, label);
    list.append(item);
  }
  return list;
}

function createRoomCard(result) {
  const { room } = result;
  const card = document.createElement("article");
  card.className = `room-card${result.official ? " is-official" : ""}`;

  const main = document.createElement("div");
  main.className = "room-main";
  const top = document.createElement("div");
  top.className = "room-topline";
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = room.name;
  const location = document.createElement("p");
  location.className = "room-location";
  location.textContent = `${room.buildingName} · ${translateFloor(room.floor)}`;
  titleGroup.append(title, location);
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = result.official ? t("officialBadge") : t("freeBadge");
  top.append(titleGroup, badge);

  const availability = document.createElement("p");
  availability.className = "availability-line";
  const strong = document.createElement("strong");
  strong.textContent = state.mode === "now" ? t("freeNow") : t("freeRange");
  const until = document.createElement("span");
  until.textContent = state.mode === "now" ? t("until", { time: result.freeUntil }) : "";
  availability.append(strong, until);

  const meta = document.createElement("p");
  meta.className = "availability-meta";
  if (state.mode === "now") {
    const duration = t("forDuration", { duration: formatDuration(result.remainingMinutes) });
    const next = result.nextBusyAt
      ? t("nextBusy", { time: result.nextBusyAt })
      : t("closesAt", { time: result.freeUntil });
    meta.textContent = `${duration} · ${next}`;
  } else {
    meta.textContent = result.nextBusyAt
      ? t("nextBusy", { time: result.nextBusyAt })
      : t("noNextBusy");
  }
  main.append(top, availability, meta);

  const details = document.createElement("details");
  details.className = "room-details";
  const summary = document.createElement("summary");
  summary.textContent = t("daySchedule");
  details.append(summary, createTimeline(room));
  card.append(main, details);
  return card;
}

function render() {
  applyTranslations();
  const schedule = state.schedule;
  elements.loadingState.hidden = !state.loading;
  elements.errorState.hidden = !state.error;
  elements.roomGrid.replaceChildren();
  elements.emptyState.hidden = true;
  elements.notice.hidden = true;

  if (state.loading) {
    elements.resultCount.textContent = "—";
    return;
  }
  if (state.error || !schedule) {
    elements.resultCount.textContent = "0";
    elements.errorMessage.textContent = state.error || t("errorFallback");
    return;
  }

  populateFloors();
  const query = currentQuery();
  const today = romeParts().date;
  const invalidRange = query.mode === "range" && query.end <= query.start;
  if (invalidRange) {
    elements.notice.textContent = t("invalidRange");
    elements.notice.hidden = false;
  } else if (schedule.scheduleDate !== today) {
    elements.notice.textContent = t("dateMismatch", { date: formatDate(schedule.scheduleDate) });
    elements.notice.hidden = false;
  } else if (schedule.status === "stale") {
    elements.notice.textContent = t("staleNotice");
    elements.notice.hidden = false;
  }

  elements.scheduleDate.textContent = t("scheduleDate", { date: formatDate(schedule.scheduleDate) });
  elements.querySummary.textContent = state.mode === "now"
    ? t("availableNow")
    : t("availableRange", { start: query.start, end: query.end });

  const search = elements.roomSearch.value.trim().toLocaleLowerCase(state.language);
  const rooms = schedule.rooms.filter((room) =>
    (!elements.buildingFilter.value || room.buildingId === elements.buildingFilter.value) &&
    (!elements.floorFilter.value || room.floor === elements.floorFilter.value) &&
    (!search || `${room.name} ${room.buildingName} ${room.floor}`.toLocaleLowerCase(state.language).includes(search)),
  );
  const results = invalidRange ? [] : findAvailableRooms(rooms, query);
  elements.resultCount.textContent = String(results.length);
  elements.emptyState.hidden = results.length > 0;
  for (const result of results) elements.roomGrid.append(createRoomCard(result));
}

async function loadSchedule() {
  state.loading = true;
  state.error = null;
  elements.refreshButton.classList.add("is-loading");
  render();
  try {
    const response = await fetch(`/api/schedule?ts=${Date.now()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || t("errorFallback"));
    state.schedule = payload;
  } catch (error) {
    state.error = error instanceof Error ? error.message : t("errorFallback");
  } finally {
    state.loading = false;
    elements.refreshButton.classList.remove("is-loading");
    render();
  }
}

function setMode(mode) {
  state.mode = mode;
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.nowControls.hidden = mode !== "now";
  elements.rangeControls.hidden = mode !== "range";
  render();
}

const initialTime = romeParts().time;
elements.startTime.value = initialTime;
elements.endTime.value = addMinutes(initialTime, 60);
elements.languageButton.addEventListener("click", () => {
  state.language = state.language === "it" ? "en" : "it";
  render();
});
elements.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
elements.refreshButton.addEventListener("click", loadSchedule);
elements.retryButton.addEventListener("click", loadSchedule);
elements.buildingFilter.addEventListener("change", () => {
  elements.floorFilter.value = "";
  render();
});
[
  elements.minimumDuration,
  elements.startTime,
  elements.endTime,
  elements.roomSearch,
  elements.floorFilter,
].forEach((element) => element.addEventListener("input", render));

setInterval(() => {
  if (state.mode === "now" && !state.loading) render();
}, 60_000);

applyTranslations();
loadSchedule();

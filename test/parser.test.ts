import { describe, expect, it } from "vitest";
import { parseScheduleHtml } from "../src/parser";

const fixture = `<!doctype html>
<html><body>
  <table>
    <tr><th>Data</th><th>Dalle</th><th>Alle</th><th>Tipo</th><th>Codice</th><th>Descrizione</th><th>Docenti</th><th>Aule assegnate</th></tr>
    <tr>
      <td>17/09/2026</td><td>10:15</td><td>12:45</td><td>Attivita'</td><td></td>
      <td>Aule studio<br /></td><td></td>
      <td><strong>Aula 24</strong>, Piano 2, Sarfatti 25;&nbsp; <strong>Aula N09</strong>, Piano terra, Sraffa 13</td>
    </tr>
    <tr>
      <td>17/09/2026</td><td>11:00</td><td>11:30</td><td>Lezione</td><td><strong>30001</strong></td>
      <td>STATISTICA<br />BIEM</td><td>NOME DOCENTE</td>
      <td><strong>Aula 24</strong>, Piano 2, Sarfatti 25</td>
    </tr>
  </table>
</body></html>`;

describe("Bocconi schedule parser", () => {
  it("parses tables without tbody and splits multi-room assignments", async () => {
    const snapshot = await parseScheduleHtml(fixture, new Date("2026-09-17T10:00:00Z"));
    expect(snapshot.scheduleDate).toBe("2026-09-17");
    expect(snapshot.rooms.length).toBeGreaterThan(70);

    const room24 = snapshot.rooms.find((room) => room.id === "sarfatti-25:aula-24");
    expect(room24?.intervals).toEqual([
      { start: "10:15", end: "12:45", kind: "official-study", label: "Aule studio" },
      { start: "11:00", end: "11:30", kind: "busy", label: "STATISTICA BIEM" },
    ]);

    const discoveredRoom = snapshot.rooms.find((room) => room.id === "sraffa-13:aula-n09");
    expect(discoveredRoom).toMatchObject({
      name: "Aula N09",
      buildingId: "sraffa-13",
      floor: "Piano terra",
    });
    expect(discoveredRoom?.intervals[0].kind).toBe("official-study");
  });

  it("does not expose teachers in the normalized payload", async () => {
    const snapshot = await parseScheduleHtml(fixture);
    expect(JSON.stringify(snapshot)).not.toContain("NOME DOCENTE");
  });

  it("rejects a page without valid schedule rows", async () => {
    await expect(parseScheduleHtml("<html><table><tr><td>vuoto</td></tr></table></html>"))
      .rejects.toThrow(/righe di orario valide/);
  });
});

// Erzeugt daten.json (für das Online-Update der App) aus daten.js
// Aufruf: node tools/daten-json.js <pfad/zu/daten.js> <ziel/daten.json>
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const code = fs.readFileSync(src, "utf8") + "\n;({ STAND, GEPRUEFT: typeof GEPRUEFT === 'undefined' ? {} : GEPRUEFT, KATEGORIEN: typeof KATEGORIEN === 'undefined' ? [] : KATEGORIEN, SERIEN, RENNEN, OFFEN, AENDERUNGEN: typeof AENDERUNGEN === 'undefined' ? [] : AENDERUNGEN })";
const { STAND, GEPRUEFT, KATEGORIEN, SERIEN, RENNEN, OFFEN, AENDERUNGEN } = eval(code);
const json = JSON.stringify({ stand: STAND, geprueft: GEPRUEFT, kategorien: KATEGORIEN, serien: SERIEN, rennen: RENNEN, offen: OFFEN, aenderungen: AENDERUNGEN }, null, 0).replace(/\],\[/g, "],\n[");
// Terminänderungen prüfen: bekannte Serie und Art, Datum im richtigen Format, bei nicht abgesagten Rennen passt eine Zeile in RENNEN
const ids = new Set(SERIEN.map(s => s.id));
for (const a of AENDERUNGEN) {
  const wo = `AENDERUNGEN ${a.serie} ${a.datum}`;
  if (!ids.has(a.serie)) throw new Error(`${wo}: unbekannte Serie`);
  if (!["verschoben", "startzeit", "abgesagt"].includes(a.art)) throw new Error(`${wo}: art muss verschoben, startzeit oder abgesagt sein`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.datum) || !/^\d{4}-\d{2}-\d{2}$/.test(a.gemeldet || "")) throw new Error(`${wo}: datum/gemeldet als JJJJ-MM-TT`);
  if (!a.titel) throw new Error(`${wo}: titel fehlt`);
  if (a.art !== "abgesagt" && !RENNEN.some(r => r[0] === a.serie && r[3] === a.datum)) throw new Error(`${wo}: kein passendes Rennen in RENNEN`);
}
fs.writeFileSync(out, json);
console.log(`${out}: Stand ${STAND}, ${SERIEN.length} Serien, ${RENNEN.length} Rennen, ${AENDERUNGEN.length} Terminänderungen`);

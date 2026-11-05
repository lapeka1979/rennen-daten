// Erzeugt daten.json (für das Online-Update der App) aus daten.js
// Aufruf: node tools/daten-json.js <pfad/zu/daten.js> <ziel/daten.json>
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const opt = n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`;
const code = fs.readFileSync(src, "utf8") + `\n;({ STAND, ${opt("GEPRUEFT")}, ${opt("KATEGORIEN")}, SERIEN, RENNEN, OFFEN, ${opt("SENDER")}, ${opt("UEBERTRAGUNG")} })`;
const { STAND, GEPRUEFT = {}, KATEGORIEN = [], SERIEN, RENNEN, OFFEN, SENDER = {}, UEBERTRAGUNG = {} } = eval(code);
// Jede Sender-Angabe muss auf einen Eintrag in SENDER zeigen
for (const [k, ids] of Object.entries(UEBERTRAGUNG)) for (const id of ids) if (!SENDER[id]) throw new Error(`UEBERTRAGUNG["${k}"]: Sender "${id}" fehlt in SENDER`);
fs.writeFileSync(out, JSON.stringify({ stand: STAND, geprueft: GEPRUEFT, kategorien: KATEGORIEN, serien: SERIEN, rennen: RENNEN, offen: OFFEN, sender: SENDER, uebertragung: UEBERTRAGUNG }, null, 0).replace(/\],\[/g, "],\n["));
console.log(`${out}: Stand ${STAND}, ${SERIEN.length} Serien, ${RENNEN.length} Rennen, ${Object.keys(SENDER).length} Sender`);

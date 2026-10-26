// Erzeugt daten.json (für das Online-Update der App) aus daten.js
// Aufruf: node tools/daten-json.js <pfad/zu/daten.js> <ziel/daten.json>
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const code = fs.readFileSync(src, "utf8") + "\n;({ STAND, SERIEN, RENNEN, OFFEN })";
const { STAND, RENNEN, OFFEN } = eval(code);
fs.writeFileSync(out, JSON.stringify({ stand: STAND, rennen: RENNEN, offen: OFFEN }, null, 0).replace(/\],\[/g, "],\n["));
console.log(`${out}: Stand ${STAND}, ${RENNEN.length} Rennen`);

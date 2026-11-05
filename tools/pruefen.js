// Prüft daten.js (und daten.json) auf Fehler, Dubletten und Lücken
// Aufruf: node tools/pruefen.js [daten.js] [daten.json] [--heute JJJJ-MM-TT] [--bericht datei.md]
//   Fehler  -> Exit-Code 1 (der Check auf GitHub wird rot)
//   Hinweise -> Exit-Code 0, stehen aber im Bericht
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const heute = opt("--heute") || new Date().toISOString().slice(0, 10);
const berichtDatei = opt("--bericht");
const [srcArg, jsonArg] = args;
const src = srcArg || path.join(__dirname, "..", "daten.js");
const jsonPfad = jsonArg || path.join(path.dirname(src), "daten.json");

// Grenzen für Hinweise
const PRUEF_ALTER_TAGE = 21;   // GEPRUEFT älter als das -> Hinweis
const VORLAUF_TAGE = 60;       // letztes Rennen einer Serie in weniger als so vielen Tagen und nichts danach -> Hinweis
const LUECKE_TAGE = 150;       // Pause zwischen zwei Rennen einer Serie länger als das -> Hinweis

const fehler = [];
const hinweise = [];
const F = (t) => fehler.push(t);
const H = (t) => hinweise.push(t);

let D;
try {
  const code = fs.readFileSync(src, "utf8") + "\n;({ STAND, GEPRUEFT: typeof GEPRUEFT === 'undefined' ? {} : GEPRUEFT, KATEGORIEN: typeof KATEGORIEN === 'undefined' ? [] : KATEGORIEN, SERIEN, RENNEN, OFFEN, SENDER: typeof SENDER === 'undefined' ? {} : SENDER, UEBERTRAGUNG: typeof UEBERTRAGUNG === 'undefined' ? {} : UEBERTRAGUNG })";
  D = eval(code);
} catch (e) {
  F(`daten.js lässt sich nicht lesen: ${e.message}`);
  ausgeben();
}
const { STAND, GEPRUEFT, KATEGORIEN, SERIEN, RENNEN, OFFEN, SENDER, UEBERTRAGUNG } = D;

const reDatum = /^\d{4}-\d{2}-\d{2}$/;
const reZeit = /^([01]\d|2[0-3]):[0-5]\d$/;
const echtesDatum = (s) => { if (typeof s !== "string" || !reDatum.test(s)) return false; const d = new Date(s + "T00:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
const tage = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const tzOk = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return typeof tz === "string" && tz.includes("/"); } catch { return false; } };
const fDatum = (s) => s.split("-").reverse().join(".");

// ── Grundgerüst ──
if (!echtesDatum(STAND)) F(`STAND "${STAND}" ist kein gültiges Datum (JJJJ-MM-TT).`);
if (!Array.isArray(SERIEN) || !Array.isArray(RENNEN) || !Array.isArray(OFFEN)) F("SERIEN, RENNEN und OFFEN müssen Listen sein.");

// ── Kategorien und Serien ──
const katIds = new Set();
for (const k of KATEGORIEN) {
  if (!k || !k.id || !k.name) F(`Kategorie ohne id oder name: ${JSON.stringify(k)}`);
  else if (katIds.has(k.id)) F(`Kategorie "${k.id}" doppelt.`);
  else katIds.add(k.id);
}
const serien = new Map();
const serienNamen = new Map();
for (const s of SERIEN) {
  if (!s || !s.id) { F(`Serie ohne id: ${JSON.stringify(s)}`); continue; }
  if (serien.has(s.id)) F(`Serie "${s.id}" doppelt in SERIEN.`);
  serien.set(s.id, s);
  if (!s.name) F(`Serie "${s.id}" hat keinen Namen.`);
  else {
    const n = s.name.toLowerCase();
    if (serienNamen.has(n)) F(`Serienname "${s.name}" doppelt ("${serienNamen.get(n)}" und "${s.id}").`);
    serienNamen.set(n, s.id);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s.farbe || "")) F(`Serie "${s.id}": Farbe "${s.farbe}" ist kein #RRGGBB-Wert.`);
  if (KATEGORIEN.length && !katIds.has(s.kategorie)) F(`Serie "${s.id}": Kategorie "${s.kategorie}" gibt es nicht in KATEGORIEN.`);
  if (s.dauer != null && !(typeof s.dauer === "number" && s.dauer >= 0)) F(`Serie "${s.id}": dauer muss eine Zahl ab 0 (Minuten) sein.`);
}

// ── GEPRUEFT ──
for (const [id, d] of Object.entries(GEPRUEFT)) {
  if (!serien.has(id)) F(`GEPRUEFT nennt unbekannte Serie "${id}".`);
  if (!echtesDatum(d)) F(`GEPRUEFT["${id}"] = "${d}" ist kein gültiges Datum.`);
  else {
    if (echtesDatum(STAND) && d > STAND) F(`GEPRUEFT["${id}"] (${d}) liegt nach STAND (${STAND}). STAND hochsetzen.`);
    if (d > heute) F(`GEPRUEFT["${id}"] (${d}) liegt in der Zukunft.`);
  }
}
for (const id of serien.keys()) {
  const d = GEPRUEFT[id];
  if (!d) H(`${serien.get(id).name}: noch nie geprüft (fehlt in GEPRUEFT).`);
  else if (echtesDatum(d) && tage(d, heute) > PRUEF_ALTER_TAGE) H(`${serien.get(id).name}: zuletzt am ${fDatum(d)} geprüft (vor ${tage(d, heute)} Tagen).`);
}

// ── Rennen: Format ──
const proSerie = new Map();
const gueltig = [];
RENNEN.forEach((r, i) => {
  const wo = `Rennen ${i + 1} (${JSON.stringify(r).slice(0, 90)})`;
  if (!Array.isArray(r) || r.length < 7 || r.length > 8) { F(`${wo}: muss 7 oder 8 Felder haben.`); return; }
  const [serie, titel, ort, datum, zeit, tz, offiziell, bis] = r;
  let ok = true;
  if (!serien.has(serie)) { F(`${wo}: unbekannte Serie "${serie}".`); ok = false; }
  if (typeof titel !== "string" || !titel.trim()) { F(`${wo}: Titel fehlt.`); ok = false; }
  if (typeof ort !== "string" || !ort.trim()) { F(`${wo}: Ort fehlt.`); ok = false; }
  if (!echtesDatum(datum)) { F(`${wo}: Datum "${datum}" ungültig.`); ok = false; }
  if (!reZeit.test(zeit || "")) { F(`${wo}: Startzeit "${zeit}" ungültig (HH:MM).`); ok = false; }
  if (!tzOk(tz)) { F(`${wo}: Zeitzone "${tz}" unbekannt.`); ok = false; }
  if (typeof offiziell !== "boolean") { F(`${wo}: 7. Feld muss true oder false sein.`); ok = false; }
  if (bis !== undefined) {
    if (!echtesDatum(bis)) { F(`${wo}: Enddatum "${bis}" ungültig.`); ok = false; }
    else if (echtesDatum(datum) && bis < datum) { F(`${wo}: Enddatum liegt vor dem Startdatum.`); ok = false; }
    else if (echtesDatum(datum) && tage(datum, bis) > 21) H(`${wo}: Event dauert ${tage(datum, bis) + 1} Tage, stimmt das Enddatum?`);
  }
  if (typeof titel === "string" && titel !== titel.trim()) H(`${wo}: Titel hat Leerzeichen am Anfang oder Ende.`);
  if (typeof ort === "string" && ort !== ort.trim()) H(`${wo}: Ort hat Leerzeichen am Anfang oder Ende.`);
  if (!ok) return;
  const e = { i, serie, titel, ort, datum, zeit, tz, offiziell, bis, zeile: r };
  gueltig.push(e);
  if (!proSerie.has(serie)) proSerie.set(serie, []);
  proSerie.get(serie).push(e);
});

// ── Dubletten ──
const schluessel = new Map();
for (const e of gueltig) {
  const k = JSON.stringify(e.zeile);
  if (schluessel.has(k)) F(`Dublette: Rennen ${schluessel.get(k) + 1} und ${e.i + 1} sind identisch (${e.serie}, ${e.titel}, ${fDatum(e.datum)}).`);
  else schluessel.set(k, e.i);
}
for (const [serie, liste] of proSerie) {
  const gesehen = new Map();
  for (const e of liste) {
    const k = `${e.datum}|${e.zeit}|${e.ort}`;
    const alt = gesehen.get(k);
    if (alt && JSON.stringify(alt.zeile) !== JSON.stringify(e.zeile)) F(`${serie}: zwei Rennen am ${fDatum(e.datum)} um ${e.zeit} in ${e.ort} ("${alt.titel}" und "${e.titel}"), eins davon ist wohl doppelt.`);
    gesehen.set(k, e);
  }
}
// Rennen, die in mehreren Serien stehen (gleiche Startzeit und gleicher Ort): Die App führt sie zusammen,
// deshalb müssen sie bis auf das Serienkürzel gleich sein.
const geteilt = new Map();
for (const e of gueltig) {
  const k = `${e.datum}|${e.zeit}|${e.tz}|${e.ort}`;
  if (!geteilt.has(k)) geteilt.set(k, []);
  geteilt.get(k).push(e);
}
for (const liste of geteilt.values()) {
  const reste = new Set(liste.map(e => JSON.stringify(e.zeile.slice(1))));
  if (reste.size > 1) F(`Gemeinsames Rennen am ${fDatum(liste[0].datum)} in ${liste[0].ort} ist nicht in allen Serien gleich (${liste.map(e => `${e.serie}: "${e.titel}"`).join(", ")}). Die Zeilen müssen bis auf das Serienkürzel identisch sein.`);
}
// ── OFFEN ──
const offenSerien = new Set();
OFFEN.forEach((o, i) => {
  if (!Array.isArray(o) || o.length !== 2 || typeof o[1] !== "string" || !o[1].trim()) { F(`OFFEN ${i + 1}: muss [serie, text] sein.`); return; }
  if (!serien.has(o[0])) F(`OFFEN ${i + 1}: unbekannte Serie "${o[0]}".`);
  offenSerien.add(o[0]);
});
const offenTexte = new Set();
for (const o of OFFEN) { const k = JSON.stringify(o); if (offenTexte.has(k)) F(`OFFEN: Eintrag doppelt (${o[0]}: ${o[1].slice(0, 60)}).`); offenTexte.add(k); }

// ── Lücken ──
for (const [id, s] of serien) {
  const liste = (proSerie.get(id) || []).slice().sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
  const kommend = liste.filter(e => (e.bis || e.datum) >= heute);
  const offen = offenSerien.has(id);
  if (!liste.length) { if (!offen) H(`${s.name}: keine Rennen und kein Eintrag in OFFEN.`); continue; }
  if (!kommend.length) { if (!offen) H(`${s.name}: keine kommenden Rennen mehr (letztes am ${fDatum(liste[liste.length - 1].datum)}) und kein Eintrag in OFFEN.`); continue; }
  const letztes = kommend[kommend.length - 1];
  if (tage(heute, letztes.datum) < VORLAUF_TAGE && !offen) H(`${s.name}: letztes eingetragenes Rennen am ${fDatum(letztes.datum)}, danach nichts. Nächste Saison nachtragen oder in OFFEN vermerken.`);
  for (let j = 1; j < kommend.length; j++) {
    const a = kommend[j - 1], b = kommend[j];
    const t = tage(a.bis || a.datum, b.datum);
    if (t > LUECKE_TAGE) H(`${s.name}: ${t} Tage Pause zwischen ${fDatum(a.datum)} (${a.titel}) und ${fDatum(b.datum)} (${b.titel}). Fehlt dazwischen etwas?`);
  }
}

// ── Sender ──
for (const [id, x] of Object.entries(SENDER)) {
  if (!x || typeof x.name !== "string" || !x.name) F(`SENDER.${id}: name fehlt.`);
  if (!x || typeof x.url !== "string" || !/^https:\/\/[^\s"<>]+$/.test(x.url)) F(`SENDER.${id}: url muss mit https:// beginnen (die App zeigt sonst keinen Link).`);
}
const serienIds = new Set(SERIEN.map(s => s && s.id));
for (const [k, ids] of Object.entries(UEBERTRAGUNG)) {
  const [serie, datum] = k.split("|");
  if (!serienIds.has(serie)) F(`UEBERTRAGUNG["${k}"]: Serie "${serie}" gibt es nicht.`);
  if (datum !== undefined && !RENNEN.some(r => r[0] === serie && r[3] === datum)) H(`UEBERTRAGUNG["${k}"]: kein Rennen von ${serie} am ${datum}, die Angabe wirkt nicht.`);
  if (!Array.isArray(ids)) { F(`UEBERTRAGUNG["${k}"]: muss eine Liste von Sendern sein.`); continue; }
  for (const id of ids) if (!SENDER[id]) F(`UEBERTRAGUNG["${k}"]: Sender "${id}" fehlt in SENDER.`);
}

// ── daten.json passt zu daten.js? ──
if (fs.existsSync(jsonPfad)) {
  const soll = JSON.stringify({ stand: STAND, geprueft: GEPRUEFT, kategorien: KATEGORIEN, serien: SERIEN, rennen: RENNEN, offen: OFFEN, sender: SENDER, uebertragung: UEBERTRAGUNG }, null, 0).replace(/\],\[/g, "],\n[");
  const ist = fs.readFileSync(jsonPfad, "utf8");
  if (ist !== soll) {
    let stand = "?";
    try { stand = JSON.parse(ist).stand; } catch { F("daten.json ist kein gültiges JSON."); }
    F(`daten.json passt nicht zu daten.js (daten.json Stand ${stand}, daten.js Stand ${STAND}). Ausführen: node tools/daten-json.js daten.js daten.json`);
  }
} else if (jsonArg) F(`${jsonPfad} fehlt.`);

ausgeben();

function ausgeben() {
  const zeilen = [];
  zeilen.push(`## Terminprüfung (${fDatum(heute)})`, "");
  if (D) zeilen.push(`Stand ${D.STAND}, ${D.SERIEN.length} Serien, ${D.RENNEN.length} Rennen, ${D.OFFEN.length} offene Einträge.`, "");
  zeilen.push(fehler.length ? `### ❌ ${fehler.length} Fehler` : "### ✅ Keine Fehler", "");
  for (const t of fehler) zeilen.push(`- ${t}`);
  if (fehler.length) zeilen.push("");
  zeilen.push(hinweise.length ? `### ⚠️ ${hinweise.length} Hinweise` : "### Keine Hinweise", "");
  for (const t of hinweise) zeilen.push(`- ${t}`);
  const text = zeilen.join("\n") + "\n";
  process.stdout.write(text);
  if (berichtDatei) fs.writeFileSync(berichtDatei, text);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `fehler=${fehler.length}\nhinweise=${hinweise.length}\n`);
  process.exit(fehler.length ? 1 : 0);
}

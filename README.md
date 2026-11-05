# rennen-daten

Renntermine für die App [Startampel](https://github.com/lapeka1979/rennen).
Die App lädt `daten.json` beim Start und alle 6 Stunden und übernimmt sie, wenn `stand` neuer ist.

Format: `{ "stand": "JJJJ-MM-TT", "geprueft": { serie: "JJJJ-MM-TT" }, "kategorien": [{ id, name }, ...], "serien": [{ id, name, info, farbe, kurz?, dauer?, kategorie }, ...], "rennen": [[serie, titel, ort, datum, startzeit, zeitzone, offiziell, bis?], ...], "offen": [[serie, text], ...], "sender": { id: { name, url, frei? } }, "uebertragung": { serie: [senderId, ...], "serie|datum": [senderId, ...] } }`
Datum und Startzeit sind Ortszeit der Strecke. `kategorien` legt die Gruppen und ihre Reihenfolge im Auswahlmenü der App fest, jede Serie nennt ihre Gruppe in `kategorie` (Serien ohne bekannte Gruppe landen unter „Weitere“). Gepflegt wird `daten.js` (gleiches Format wie in der App). Danach `STAND` hochsetzen und `node tools/daten-json.js daten.js daten.json` ausführen.

## Sender (wo läuft das Rennen?)

`SENDER` listet TV-Sender und Streams mit Name, Link und `frei: true`, wenn man ohne Abo schauen kann.
`UEBERTRAGUNG` sagt, welche Sender eine Serie in Deutschland zeigen (Reihenfolge = Anzeige, freie
Angebote zuerst lohnt sich). Ein Schlüssel `"serie|datum"` (Renntag wie in `RENNEN`) gilt nur für dieses
eine Rennen und ersetzt dort die Serien-Angabe, etwa wenn RTL ein Formel-1-Rennen zusätzlich frei zeigt.
Serien ohne Eintrag zeigen in der App einfach keine Sender. Ändern sich TV-Rechte (meist zum
Saisonwechsel), in `daten.js` anpassen; `tools/daten-json.js` bricht ab, wenn eine Angabe auf einen fehlenden
Sender zeigt. Die App braucht dafür kein Update.

## Serienwünsche

In der App kann man eine Rennserie suchen und, wenn sie fehlt, als Issue mit dem Titel
`Serienwunsch: <Name>` anfragen. Die wöchentliche Pflege prüft offene Wünsche, nimmt die Serie
mit Terminen auf (neuer Eintrag in `SERIEN` mit id, name, info, farbe, kurz, dauer, kategorie) und schließt
das Issue als erledigt oder, wenn es keine offiziellen Termine gibt, als „not planned“ mit Begründung.

## Gleiche Rennen in mehreren Serien

Manche Rennen stehen in mehreren Serien, z. B. die 24h-Rennen (eigene Serie und WEC, IMSA, GTWC, IGTC,
24H Series) oder die Texas 8 Stunden (IGTC und GT World Challenge America). Die App führt sie über
Startzeit und Ort zusammen. Diese Zeilen müssen deshalb bis auf das Serienkürzel identisch bleiben.

## Automatische Prüfung

`node tools/pruefen.js` prüft `daten.js` und `daten.json`, bevor etwas in die App gelangt:

- **Fehler** (Check wird rot): ungültiges Datum, Startzeit oder Zeitzone, unbekannte Serie oder
  Kategorie, doppelte Rennen, gemeinsame Rennen (z. B. 24h) die nicht in allen Serien gleich sind,
  `GEPRUEFT` nach `STAND`, und `daten.json` passt nicht zu `daten.js`.
- **Hinweise**: Serie ohne kommende Rennen und ohne Eintrag in `OFFEN`, Saison endet in weniger als
  60 Tagen ohne Folgetermine, mehr als 150 Tage Pause innerhalb einer Serie, Serie länger als
  21 Tage nicht geprüft.

Die GitHub Action „Terminprüfung“ läuft bei jedem Push und Pull Request, der die Daten ändert, und
montags nach der wöchentlichen Pflege. Sie hält das Issue „Terminprüfung: Hinweise“ (Label
`terminpruefung`) aktuell und schließt es, sobald nichts mehr zu melden ist. Vor jedem Push
`node tools/pruefen.js` lokal ausführen.

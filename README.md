# rennen-daten

Renntermine für die App [Startampel](https://github.com/lapeka1979/rennen).
Die App lädt `daten.json` beim Start und alle 6 Stunden und übernimmt sie, wenn `stand` neuer ist.

Format: `{ "stand": "JJJJ-MM-TT", "geprueft": { serie: "JJJJ-MM-TT" }, "rennen": [[serie, titel, ort, datum, startzeit, zeitzone, offiziell, bis?], ...], "offen": [[serie, text], ...] }`
Datum und Startzeit sind Ortszeit der Strecke. Gepflegt wird `daten.js` (gleiches Format wie in der App). Danach `STAND` hochsetzen und `node tools/daten-json.js daten.js daten.json` ausführen.

## Serienwünsche

In der App kann man eine Rennserie suchen und, wenn sie fehlt, als Issue mit dem Titel
`Serienwunsch: <Name>` anfragen. Die wöchentliche Pflege prüft offene Wünsche, nimmt die Serie
mit Terminen auf (neuer Eintrag in `SERIEN` mit id, name, info, farbe, kurz, dauer) und schließt
das Issue als erledigt oder, wenn es keine offiziellen Termine gibt, als „not planned“ mit Begründung.

# rennen-daten

Renntermine für die App [Startampel](https://github.com/lapeka1979/rennen).
Die App lädt `daten.json` beim Start und alle 6 Stunden und übernimmt sie, wenn `stand` neuer ist.

Format: `{ "stand": "JJJJ-MM-TT", "rennen": [[serie, titel, ort, datum, startzeit, zeitzone, offiziell, bis?], ...], "offen": [[serie, text], ...] }`
Datum und Startzeit sind Ortszeit der Strecke. Gepflegt wird `daten.js` (gleiches Format wie in der App). Danach `STAND` hochsetzen und `node tools/daten-json.js daten.js daten.json` ausführen.

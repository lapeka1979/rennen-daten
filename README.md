# rennen-daten

Renntermine für die App [Startampel](https://github.com/lapeka1979/rennen).
Die App lädt `daten.json` beim Start und alle 6 Stunden und übernimmt sie, wenn `stand` neuer ist.

Format: `{ "stand": "JJJJ-MM-TT", "geprueft": { serie: "JJJJ-MM-TT" }, "kategorien": [{ id, name }, ...], "serien": [{ id, name, info, farbe, kurz?, dauer?, kategorie }, ...], "rennen": [[serie, titel, ort, datum, startzeit, zeitzone, offiziell, bis?], ...], "offen": [[serie, text], ...], "aenderungen": [{ serie, datum, art, titel, vorher?, ort?, grund?, gemeldet }, ...] }`
Datum und Startzeit sind Ortszeit der Strecke. `kategorien` legt die Gruppen und ihre Reihenfolge im Auswahlmenü der App fest, jede Serie nennt ihre Gruppe in `kategorie` (Serien ohne bekannte Gruppe landen unter „Weitere“). Gepflegt wird `daten.js` (gleiches Format wie in der App). Danach `STAND` hochsetzen und `node tools/daten-json.js daten.js daten.json` ausführen.

## Serienwünsche

In der App kann man eine Rennserie suchen und, wenn sie fehlt, als Issue mit dem Titel
`Serienwunsch: <Name>` anfragen. Die wöchentliche Pflege prüft offene Wünsche, nimmt die Serie
mit Terminen auf (neuer Eintrag in `SERIEN` mit id, name, info, farbe, kurz, dauer, kategorie) und schließt
das Issue als erledigt oder, wenn es keine offiziellen Termine gibt, als „not planned“ mit Begründung.

## Gleiche Rennen in mehreren Serien

Manche Rennen stehen in mehreren Serien, z. B. die 24h-Rennen (eigene Serie und WEC, IMSA, GTWC, IGTC,
24H Series) oder die Texas 8 Stunden (IGTC und GT World Challenge America). Die App führt sie über
Startzeit und Ort zusammen. Diese Zeilen müssen deshalb bis auf das Serienkürzel identisch bleiben.

## Terminänderungen

Wird ein Rennen verschoben, abgesagt oder bekommt es eine neue Startzeit, wird die Zeile in `RENNEN`
geändert (bzw. bei einer Absage entfernt) und zusätzlich ein Eintrag in `AENDERUNGEN` angelegt:
`art` ist `verschoben`, `startzeit` oder `abgesagt`, `datum` ist der Renntag wie in `RENNEN`
(bei Absagen der bisherige), `vorher` sagt kurz, wie es vorher war, `gemeldet` ist das heutige Datum.
Die App markiert das Rennen in Liste, Monat und Detail und meldet die Änderung einmal per Hinweis
(in der App und als Android-Benachrichtigung) an alle, die der Serie folgen. Rennen in mehreren Serien
bekommen je Serie einen Eintrag. `tools/daten-json.js` prüft die Einträge und bricht bei Fehlern ab.
Einträge, deren Renntag mehr als 30 Tage vorbei ist, dürfen entfernt werden.

# WohnungBot

Minimaler Node.js-Bot fuer Wohnungsbenachrichtigungen in Telegram.

## Was der MVP kann

- Telegram-Bot ueber den offiziellen Bot API Token
- Speicherung freigeschalteter Chat-IDs
- Filter fuer Hamburg, Bruttokaltmiete und Warmmiete-Fallback
- Ausschluss von WG, Zimmern, Tausch, Senioren-/Pflegewohnen und temporaeren Angeboten
- Inline-Buttons fuer Opened, Applied und Ignore
- Taegliche Zusammenfassung
- Deduplizierung bereits versendeter Eintraege
- Demo-Quelle und Dateiquelle als Platzhalter fuer echte ImmoMio/SAGA-Adapter

## Start

1. `.env.example` nach `.env` kopieren
2. Telegram Token eintragen
3. Starten:

```powershell
npm.cmd run start
```

4. Dem Bot in Telegram `/start` schicken

## Telegram-Kommandos

- `/start` - Chat registrieren
- `/test` - Testnachricht
- `/status` - Status und Kriterien
- `/scan` - Sofortiger Wohnungs-Check
- `/summary` - Zusammenfassung manuell senden

## Kriterien

- Stadt: Hamburg, alle Hamburger Bezirke
- Hauptlimit fuer 1 Person: Bruttokaltmiete bis 573 EUR
- Bruttokaltmiete wird aus `bruttokaltRent`, `coldRent + nebenkosten` oder `warmRent - heizkosten` ermittelt
- Falls nur Warmmiete bekannt ist: maximal 650 EUR
- Warmmiete bis 700 EUR nur, wenn Bruttokaltmiete eindeutig unter 573 EUR liegt
- Prioritaet: SAGA Hamburg, dann Sozialwohnung/oeffentlich gefoerdert/WBS, dann andere Quellen

## Quellen

Aktuell gibt es Demo- und Dateiquellen. Echte Adapter fuer SAGA/ImmoMio/ImmoScout24/Immowelt/Immonet/Kleinanzeigen/WG-Gesucht koennen in `src/sources/` ergaenzt werden, wenn ein legal nutzbarer Feed, Alert, RSS oder stabiler Parser verfuegbar ist.

## Naechster Schritt

Die erste echte Integrationsarbeit ist ein Source-Adapter fuer ImmoMio/SAGA oder ein Parser fuer deren E-Mail-Benachrichtigungen.

## Dateiquelle fuer schnelle Tests

Du kannst Eintraege nach `data/manual-listings.json` legen. Das Format steht in `manual-listings.example.json`.

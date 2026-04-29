# WohnungBot

Minimaler Node.js-Bot fuer Wohnungsbenachrichtigungen in Telegram.

## Was der MVP kann

- Telegram-Bot ueber den offiziellen Bot API Token
- Speicherung freigeschalteter Chat-IDs
- Filter fuer Hamburg und maximale Warmmiete
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

## Naechster Schritt

Die erste echte Integrationsarbeit ist ein Source-Adapter fuer ImmoMio/SAGA oder ein Parser fuer deren E-Mail-Benachrichtigungen.

## Dateiquelle fuer schnelle Tests

Du kannst Eintraege nach `data/manual-listings.json` legen. Das Format steht in `manual-listings.example.json`.

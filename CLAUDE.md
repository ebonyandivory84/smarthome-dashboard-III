# SmartHome Dashboard III — Projektanweisungen

Erbt Regeln aus `projects/coding/CLAUDE.md`.

## Projektkontext
- **Ziel**: Leichtgewichtiger ioBroker-Adapter mit React 19 + Vite Dashboard — optimiert für Android RK3399
- **Typ**: ioBroker Adapter + React Web Frontend, `visualization`, `daemon`, `compact: true`
- **Status**: v0.1.0, aktiv entwickelt
- **GitHub**: https://github.com/ebonyandivory84/smarthome-dashboard-III
- **Port**: `8110`, Dashboard unter `/smarthome-dashboard-iii`
- **Vorgänger**: Dashboard I (Expo/React Native) unter Port `8109` — bleibt unberührt

## Tech Stack
| Layer | Technologie |
|---|---|
| Frontend | React 19 + Vite 6 |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animation | Framer Motion |
| Grid | react-grid-layout (`ResponsiveGridLayout`) |
| Backend | Node.js + Express 5 + ws |
| TypeScript | Vite + tsc |

## Repo-Struktur
```
smarthome-dashboard-iii/
├── src/
│   ├── components/
│   │   ├── grid/         ← DashboardGrid, WidgetFrame
│   │   ├── layout/       ← TopBar, PageTabs
│   │   ├── modals/       ← SettingsModal, WidgetLibraryModal, WidgetEditorModal
│   │   └── widgets/      ← 13 Widget-Typen
│   ├── context/          ← DashboardContext (State-Management)
│   ├── hooks/            ← useIoBrokerStates, useCameraSnapshot
│   ├── services/         ← iobroker.ts (API + StatePushWS)
│   ├── types/            ← dashboard.ts
│   └── utils/            ← sounds.ts, theme.ts
├── public/sounds/        ← 10 MP3-Dateien (hardcoded)
├── adapter/www/          ← Production Build (gitignored)
├── admin/jsonConfig.json
├── io-package.json
├── main.js               ← ioBroker Adapter Backend
├── vite.config.ts
└── package.json
```

## Widget-Typen (13)
`state`, `camera`, `cameraTalk`, `solar`, `energy`, `wallbox`, `heating`, `grafana`, `weather`, `numpad`, `link`, `log`, `script`, `systemStats`

## Responsive Layout
| Breakpoint | Spalten |
|---|---|
| ≥ 1280px (Desktop) | 3 |
| 768–1279px (Tablet) | 3 |
| < 768px (Phone) | 1 |

## Dev-Workflow
```bash
# Frontend dev:
npm run dev          # Vite auf localhost:5173

# Production build:
npm run build        # → dist/
npm run build:copy   # build + cp → adapter/www/

# Adapter starten (lokal):
node main.js
```

## Deploy auf ioBroker (Raspberry Pi)
```bash
ssh -i ~/.ssh/id_ed25519_iobroker sebastian@192.168.44.31 \
  "iobroker stop smarthome-dashboard-iii && \
   iobroker url https://github.com/ebonyandivory84/smarthome-dashboard-III && \
   iobroker start smarthome-dashboard-iii"
```

## Sound-System
10 hardcoded MP3 in `public/sounds/`: `tap1–5`, `maximize`, `minimize`, `confirm`, `scroll`, `error`.
Playback via `src/utils/sounds.ts → playSound(key)`. Volume konfigurierbar in Settings.

## Zuständige Skills
| Aufgabe | Tool |
|---|---|
| React/TypeScript | `ecc:react-reviewer`, `ecc:typescript-reviewer` |
| Build-Fehler (Vite) | `ecc:react-build` |
| Architekturentscheidungen | `ecc:architect` |

## Kein Graphify
Dieses Projekt hat keinen Graphify-Graph. `graphify`-Regeln aus `projects/coding/CLAUDE.md` gelten hier **nicht**.

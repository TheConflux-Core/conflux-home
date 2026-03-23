# Conflux Home — Your AI Family Lives Here

The desktop application where AI agents live, work, and grow alongside you.

## Quick Start

### Prerequisites
- Node.js 20+
- Rust (for Tauri builds): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Install & Run

```bash
# Install dependencies
npm install

# Run the desktop app (Tauri + Vite)
npm run tauri:dev

# OR run web-only (no desktop shell, just browser)
npm run dev
```

### Build

```bash
# Build the desktop app (.deb, .msi, .dmg)
npm run tauri:build

# Build web only
npm run build
```

## Architecture

```
conflux-home/
├── src/                    # React frontend
│   ├── App.tsx             # Main app (routing, state)
│   ├── components/         # UI components
│   │   ├── Desktop.tsx     # Agent desktop with wallpaper
│   │   ├── ChatPanel.tsx   # Streaming chat interface
│   │   ├── Marketplace.tsx # Agent marketplace
│   │   ├── Onboarding.tsx  # 5-step setup wizard
│   │   ├── Settings.tsx    # Theme & preferences
│   │   └── ...
│   ├── gateway-client/     # OpenClaw Gateway API SDK
│   ├── hooks/              # React hooks
│   └── lib/                # Utilities (theme, shortcuts)
├── src-tauri/              # Rust backend (Tauri v2)
│   ├── tauri.conf.json     # Tauri configuration
│   └── src/                # Rust source
├── public/                 # Static assets
│   ├── avatars/            # Agent avatar images
│   └── wallpapers/         # Desktop wallpapers
└── dist/                   # Build output
```

## Gateway Connection

Conflux Home connects to the OpenClaw gateway at `localhost:18789`. You need:
1. OpenClaw gateway running locally
2. An OpenRouter API key configured

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (web only) |
| `npm run tauri:dev` | Full desktop app (dev mode) |
| `npm run build` | Build frontend only |
| `npm run tauri:build` | Build desktop app |
| `npm run preview` | Preview production build |

## License

Proprietary — The Conflux AI

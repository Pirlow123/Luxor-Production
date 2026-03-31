# Luxor Production v1.2

Universal production control platform for live events, broadcast, and AV installations.

## Features

- **Media Server Control** — Hippotizer, Resolume Arena, vMix, CasparCG, OBS Studio, Barco E2/S3, QLab, Disguise, Pixera
- **LED Processor Control** — Novastar, Megapixel Helios, Brompton Tessera
- **PTZ Camera Control** — Panasonic AW-HE/UE series, BirdDog (pan/tilt/zoom, presets, tally, focus, iris)
- **Network Switch Monitoring** — Luminex GigaCore, LumiNode, Cameo XNode (ports, VLANs, PoE, LLDP)
- **Lighting Console Integration** — grandMA3/MA2 Web Remote, Avolites Titan (executors, cues, playback)
- **Intercom Systems** — Riedel Bolero / Artist (beltpacks, channels, antennas, matrix crosspoints)
- **PIXL Grid** — Test pattern generator for LED walls and displays
- **LED Calculator** — Panel layout calculator with pixel mapping
- **Signal Flow Diagrams** — Visual signal routing builder with export
- **Show Runner** — Cue list management and timecode integration
- **System Status** — Unified health dashboard for all connected devices

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

## Installation

### 1. Clone or download

```bash
git clone <repository-url>
cd luxor-production
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm start
```

This launches the Electron desktop app.

## Building Installers

### Windows

```bash
npm run build
```

Output: `release/Luxor Production Setup 1.2.0.exe` (NSIS installer)

- Allows custom install directory
- Creates desktop and Start Menu shortcuts

### macOS

> **Note:** Building a macOS installer requires running on a Mac with Xcode Command Line Tools installed.

```bash
npm run build:mac
```

Output: `release/Luxor Production-1.2.0.dmg` and `release/Luxor Production-1.2.0-mac.zip`

#### macOS installation steps:

1. Open the `.dmg` file
2. Drag **Luxor Production** to the **Applications** folder
3. On first launch, if macOS blocks the app:
   - Go to **System Settings > Privacy & Security**
   - Scroll down and click **Open Anyway** next to the Luxor Production message
   - Or right-click the app in Applications and select **Open**

#### macOS code signing (optional):

For distribution outside your team, sign and notarize the app:

```bash
# Set environment variables before building
export CSC_LINK="path/to/your/certificate.p12"
export CSC_KEY_PASSWORD="your-certificate-password"
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="your-team-id"

npm run build:mac
```

### Linux

```bash
npm run build:linux
```

Output: `release/Luxor Production-1.2.0.AppImage`

### All platforms

```bash
npm run build:all
```

## Running without Electron (Web only)

If you just want the web interface without the desktop wrapper:

```bash
npx serve -l 8080 -s .
```

Then open `http://localhost:8080` in your browser.

## Project Structure

```
luxor-production/
  electron-main.js    # Electron main process
  preload.js          # Electron preload script
  index.html          # Main HTML shell
  css/                # Stylesheets
  js/
    app.js            # Application core, routing, sidebar
    state.js          # Application state management
    components.js     # Shared UI components
    api.js            # Hippotizer REST API client
    resolume-api.js   # Resolume Arena API client
    vmix-api.js       # vMix API client
    casparcg-api.js   # CasparCG API client
    obs-api.js        # OBS WebSocket API client
    barco-api.js      # Barco E2/S3 API client
    qlab-api.js       # QLab API client
    disguise-api.js   # Disguise API client
    pixera-api.js     # Pixera API client
    websocket.js      # WebSocket callback client
    pages/            # Page modules (dashboard, ptz, netswitch, lighting, intercom, etc.)
  assets/             # Icons and logos
  mock-server.js      # Virtual Hippotizer mock server for demos
  release/            # Build output directory
```

## License

MIT

# Luxor Production v1.3

Universal production control platform for live events, broadcast, and AV installations.

## Features

### Media Server Control
- **Hippotizer** — Full REST API + WebSocket, timelines, media, mixes, presets, pins, timecode
- **Resolume Arena** — Composition, clips, layers, effects, tempo, crossfader
- **vMix** — Inputs, overlays, transitions, streaming, recording, audio
- **CasparCG** — Channels, layers, templates, media playback
- **OBS Studio** — Scenes, sources, streaming, recording, virtual cam
- **Barco E2/S3** — Presets, screen destinations, layers, sources, aux
- **QLab** — Workspaces, cues, groups, go/stop/pause, levels
- **Disguise** — Transport, tracks, sections, annotations
- **Pixera** — Timelines, cues, resources, screens, outputs
- **Blackmagic ATEM** — Program/preview switching, transitions, USK/DSK, macros, media pool

### LED & Processing
- **LED Processor Control** — Novastar, Megapixel Helios, Brompton Tessera
- **LED Calculator** — Panel layout calculator with pixel mapping and data rates
- **LED Setup Calculator** — Full LED wall setup planning
- **PIXL Grid** — Test pattern generator for LED walls and displays
- **LED Auto-Connect** — Automatic LED processor port mapping and cabling
- **Diagram Builder** — Visual signal flow routing with SVG/PNG export

### 3D Tools
- **3D Stage Visualizer** — Three.js stage scene with trusses, screens, lighting rigs
- **3D LED Layout** — Three.js LED panel arrangement and visualization

### Production Tools
- **Power Distribution** — Distro mapping with Socapex, PowerCON, CEE, Powerlock, Camlock cables, canvas visualization
- **Fixture Patch** — Eurotruss-based fixture layout with draggable fixtures, DMX universe/address, Fixture ID, ND, AC circuit, bulk tools
- **Truck Packer** — 3D truck/container load planning with custom cases and weight tracking
- **Capture Viewer** — Import Capture 2025 .c2p files, extract fixture/truss/scene data, 3D preview
- **Specifications** — Full manufacturer specs for Robe, Acme, Chauvet, Martin, Clay Paky, GLP, ETC, Absen Polaris, Eurotruss, Movecat, Hippo Borealis, Barco E2, grandMA3, ChamSys, Yamaha, DiGiCo, Allen & Heath

### Network & Control
- **PTZ Camera Control** — Panasonic AW-HE/UE series, BirdDog (pan/tilt/zoom, presets, tally, focus, iris)
- **Network Switch Monitoring** — Luminex GigaCore, LumiNode, Cameo XNode (ports, VLANs, PoE, LLDP)
- **Lighting Console Integration** — grandMA3/MA2 Web Remote, Avolites Titan (executors, cues, playback)
- **Intercom Systems** — Riedel Bolero / Artist (beltpacks, channels, antennas, matrix crosspoints)
- **Network Config** — IP configuration and subnet management
- **DMX / Art-Net** — Universe management and Art-Net routing
- **Sync & Cluster** — Multi-server synchronization

### System
- **Show Runner** — Cue list management with timecode integration
- **Dashboard** — Unified overview with quick actions
- **System Status** — Health dashboard for all connected devices
- **Event Log** — Activity and error logging
- **Settings** — App configuration and preferences
- **Project Files** — Save/load `.luxor` project files with full state

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

## Installation

### 1. Clone or download

```bash
git clone https://github.com/Pirlow123/luxor-production.git
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

Output: `release/Luxor Production 1.3 setup.exe` (NSIS installer)

- Allows custom install directory
- Creates desktop and Start Menu shortcuts

### macOS

> **Note:** Building a macOS installer requires running on a Mac with Xcode Command Line Tools installed.

```bash
npm run build:mac
```

Output: `release/Luxor Production-1.3.0.dmg` and `release/Luxor Production-1.3.0-mac.zip`

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

Output: `release/Luxor Production-1.3.0.AppImage`

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
    atem-api.js       # Blackmagic ATEM API client
    websocket.js      # WebSocket callback client
    pages/            # Page modules
      dashboard.js    # Dashboard overview
      showrun.js      # Show runner / cue list
      status.js       # System status
      timelines.js    # Timeline control
      media.js        # Media management
      mixes.js        # Mixes & layers
      presets.js      # Preset management
      pins.js         # Pin control
      timecode.js     # Timecode settings
      composition.js  # Resolume composition
      network.js      # Network configuration
      dmx.js          # DMX / Art-Net
      sync.js         # Sync & cluster
      ledprocessor.js # LED processor control
      ledcalc.js      # LED calculator
      ledsetup.js     # LED setup calculator
      pixlgrid.js     # PIXL Grid test patterns
      diagram.js      # Signal flow diagram builder
      ledconnect.js   # LED auto-connect
      stage3d.js      # 3D stage visualizer
      ledpanel3d.js   # 3D LED panel layout
      power.js        # Power distribution
      fixtures.js     # Fixture patch layout
      truckpack.js    # Truck packer
      captureview.js  # Capture 2025 viewer
      specifications.js # Equipment specifications
      ptz.js          # PTZ camera control
      netswitch.js    # Network switch monitoring
      lighting.js     # Lighting console integration
      intercom.js     # Intercom systems
      settings.js     # App settings
      logs.js         # Event log
  assets/             # Icons and logos
  mock-server.js      # Virtual Hippotizer mock server for demos
  release/            # Build output directory
```

## License

MIT

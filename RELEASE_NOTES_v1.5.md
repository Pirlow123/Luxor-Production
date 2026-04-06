# Luxor Production v1.5.0

## What's New

### Universal Engine Pages
- **Engine Media Page** — Browse and manage media for all engines (CasparCG, Pixera, ATEM, vMix, OBS, Resolume) from a dedicated universal page
- **Engine Mixing/Layers Page** — Audio mixing, layer controls, and faders for all engines with engine-specific features (vMix faders, OBS audio, ATEM gain/AFV, CasparCG mixer, Barco layers, and more)
- All engines now follow the Hippo pattern: Show Run = live control, with separate dedicated pages for Media and Mixing

### NovaStar COEX LED Processor Support
- Full API support for NovaStar COEX line (MX40 Pro, CX40 Pro, CX80 Pro, MX40 Pro S)
- Cloud OS API auto-discovery — tries multiple endpoint patterns and caches the working one
- Auto-detects correct port (80, 8001, 8080) for COEX devices
- Brightness, input switching, test patterns, presets, and display mode all route to the correct API endpoints per firmware version
- Six NovaStar endpoint patterns covering COEX Cloud OS, VX Series, NovaPro, and legacy firmware

### Brand Logos
- Added official brand logos for NovaStar, Megapixel Helios, Luminex, Cameo, Panasonic, and Riedel
- Logos appear in LED processor sidebar, brand picker, network switch list, and device cards

### First-Time Beta Disclaimer
- New first-launch disclaimer popup with Luxor logo
- Users must acknowledge beta status and accept terms before using the app
- Only shows once — stored after acceptance

---

## Bug Fixes

### Page Navigation
- **Fixed: Refresh always redirected to Show Run** — The app now remembers your last page and restores it on refresh/restart. If you were on LED Processors, PTZ, or any other page, you'll stay there
- **Fixed: Engine green border always showing** — The selected highlight on engine cards now only appears when you're actually on an engine-related page (Show Run, Dashboard, Media, etc.), not when you're on PTZ, LED Processors, or Network Switches
- **Fixed: Clicking connected engine yanked navigation** — Clicking an already-connected engine in the sidebar no longer force-navigates you away from your current page

### LED Processors
- **Fixed: NovaStar MX40 Pro features not working** — Actions (brightness, input, test pattern, etc.) were sending to wrong API paths. Now uses action-key routing that maps to the correct discovered endpoint pattern
- **Fixed: MX40 Pro incorrectly listed as Luminex LumiNode** — Removed erroneous LumiNode MX40 Pro entries from network switch page. MX40 Pro is correctly a NovaStar COEX processor
- **Fixed: Remove button had no confirmation** — Clicking the X on a processor now shows a confirmation dialog with device name, brand, model, and IP

### PTZ Cameras
- **Fixed: Image Adjustments always showing 128** — Detail/Sharpness, Contrast, Brightness, and Saturation sliders now store their values per camera and display the actual slider position instead of always resetting to 128

### Network Switches
- Improved Luminex API connectivity with alternative paths for different firmware versions
- Better port data normalization for different Luminex device responses

---

## Technical Changes
- New `_apiAction()` / `_resolveActionUrl()` system for LED processors — action handlers use named keys instead of hardcoded paths
- Endpoint patterns now include both read and write paths for all actions
- `localStorage.luxor_last_page` persists current page across refreshes
- Startup reconnect preserves user's current page instead of forcing navigation

---

> **Beta Software** — This application is under active development. Features may be incomplete or change without notice. Use at your own risk.

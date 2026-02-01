# Windsurf Status Monitor

A lightweight Windsurf extension that monitors the official Windsurf status API and shows native editor notifications when the service status changes.

The extension runs automatically in the background and does not require any manual interaction.

---

## Features

- Periodically checks the Windsurf status API
- Shows notifications for:
  - Maintenance
  - Incidents
  - Service outages
- Detects network/API failures
- Notifies when the service becomes reachable again
- Avoids notification spam

---

## Installation

### Option 1: Install from VSIX (recommended)

1. Download the latest `.vsix` file from the **Releases** page.
2. Open Windsurf.
3. Open the Command Palette:
   - `Ctrl+Shift+P` (Windows / Linux)
   - `Cmd+Shift+P` (macOS)
4. Select **Extensions: Install from VSIX...**
5. Choose the downloaded `.vsix` file.
6. Reload the editor when prompted.

---

### Option 2: Install from source (development)

```bash
git clone https://github.com/<your-org>/windsurf-status.git
cd windsurf-status
npm install
npm run compile

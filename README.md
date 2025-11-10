# WIZ LAN Controller

A complete, production-ready full-stack TypeScript application for discovering, controlling, and automating WIZ Connected smart bulbs on your local network.

## ⚠️ IMPORTANT SECURITY WARNING

**This software is designed for use only on networks you own or have explicit permission to scan.** Unauthorized network scanning may violate:
- Computer fraud and abuse laws
- Terms of service agreements
- Privacy regulations

**Use responsibly and only on your own network.**

## Features

### Device Management
- 🔍 **Network Discovery**: Multi-heuristic scanning (ARP table, port probe, MAC OUI lookup)
- 💡 **Device Control**: Power on/off, brightness, color temperature, and RGB control
- 💾 **Device Persistence**: All discovered devices saved to database across restarts
- 📊 **Confidence Scoring**: Multi-level device identification confidence
- 🔧 **Capability Detection**: Automatic detection of device features (RGB, color temp, scenes)

### Advanced Control
- 🎨 **Scene Control**: 32 built-in WIZ scenes (Ocean, Party, Sunset, Halloween, etc.)
- ⚡ **Scene Speed**: Adjustable speed for dynamic scenes (0-200)
- 🌈 **RGB Control**: Individual Red, Green, Blue sliders (0-255) with live preview
- 🎛️ **Control Modes**: Switch between Manual, Scenes, and RGB control modes

### Group Management
- 👥 **Device Groups**: Create groups to control multiple devices simultaneously
- 🎯 **Multi-Device Control**: Power, brightness, and color changes for entire groups
- 🏷️ **Custom Groups**: Name, color, and icon customization for groups
- 🔗 **Flexible Associations**: Devices can belong to multiple groups

### Automation
- ⏰ **Smart Scheduling**: Cron-based automation with persistent storage
- 📅 **Flexible Timing**: Schedule individual devices or entire groups
- 🔄 **Real-time Updates**: WebSocket-based live device state synchronization

### User Interface
- 🌙 **Retro Cyberpunk UI**: Neon colors, glowing effects, and 80s-inspired design
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- ⚡ **Real-time Updates**: Live state changes via WebSocket
- 🎨 **Modern Stack**: React 18 with TailwindCSS and Lucide icons

### Deployment
- 🐳 **Docker Support**: Containerized deployment with docker-compose
- 🧪 **Tested**: Unit and integration tests included
- 🔒 **Secure**: Environment-based configuration

## Architecture

### Backend (Node + TypeScript + Express)
- **Scanner**: Network enumeration with configurable concurrency and device persistence
- **WIZ Client**: UDP-based protocol implementation (port 38899) with scene and RGB control
- **Database**: SQLite with device persistence, groups, and many-to-many relationships
- **Scheduler**: Cron-based automation with persistent storage
- **WebSocket Server**: Real-time bi-directional communication with group updates
- **RESTful API**: Complete CRUD operations for devices, groups, schedules, and scenes

### Frontend (React + TypeScript + Vite)
- **Device Management**: Live device grid with power, brightness, color temp, RGB, and scene controls
- **Group Management**: Create and control device groups with custom colors and icons
- **Network Scanner**: Interactive scan interface with progress tracking
- **Scheduler**: Visual cron-based automation manager
- **Control Modes**: Tabbed interface for Manual, Scenes, and RGB control
- **WebSocket Integration**: Real-time device and group state updates

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js 20+, TypeScript, Express, Socket.IO, Better-SQLite3, node-schedule |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Query, React Router |
| Protocol | UDP/TCP (port 38899), JSON-RPC over datagram |
| Database | SQLite (better-sqlite3) |
| Testing | Jest, ts-jest |
| Build | TypeScript, Vite, TSX |
| Deployment | Docker, docker-compose |

## Prerequisites

- **Node.js**: 20.0.0 or higher
- **npm**: 8.0.0 or higher (comes with Node.js)
- **Network Access**: LAN access with broadcast/multicast capabilities
- **Operating System**: Windows, macOS, or Linux

## Quick Start

### 1. Installation

```bash
# Clone or extract the project
cd wiz-lan-controller

# Install dependencies (includes frontend)
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env if needed (defaults work for most setups)
```

### 2. Development Mode

```bash
# Start backend and frontend in development mode
npm run dev

# Backend will start on http://localhost:3000
# Frontend will start on http://localhost:5173
```

Open your browser to `http://localhost:5173`

### 3. First Scan

1. Navigate to **Scan** page
2. Leave subnet empty for auto-detection (or specify manually, e.g., `192.168.1.0/24`)
3. Adjust concurrency (default: 20) based on your network
4. Click **Start Scan**
5. Wait for discovery (typical /24 network: 1-2 minutes)
6. View discovered devices on the **Devices** page

### 4. Control Devices

On the **Devices** page:
- **Power Control**: Toggle devices on/off with the main button
- **Manual Mode**: 
  - Adjust brightness slider (10-100%)
  - Change color temperature (2200-6500K)
- **Scene Mode**: 
  - Select from 32 built-in scenes (Ocean, Party, Sunset, Halloween, etc.)
  - Adjust scene speed (20-200) for dynamic scenes
- **RGB Mode**:
  - Individual Red, Green, Blue sliders (0-255)
  - Live color preview with glow effect
- Devices update in real-time via WebSocket

### 5. Create Device Groups

On the **Groups** page:
- Click **New Group** to create a group
- Name your group and choose a color/icon
- Add devices to the group
- Control all devices in the group simultaneously:
  - Power on/off for entire group
  - Adjust brightness for all devices
  - Apply scenes to all devices
- Devices can belong to multiple groups

### 6. Create Schedules

On the **Scheduler** page:
- Click **Create Schedule**
- Name your schedule (e.g., "Morning Lights")
- Select devices
- Choose action (Turn ON/OFF)
- Set cron expression (e.g., `0 8 * * *` for 8 AM daily)
- Save and enable

## Production Build

### Standard Deployment

```bash
# Build backend and frontend
npm run build

# Start production server
npm start
```

The server serves both API and static frontend on port 3000.

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with docker-compose (recommended)
docker-compose up -d

# Or run directly
npm run docker:run
```

**Important**: Docker requires `--network host` (Linux) or proper port mapping (Windows/Mac) for LAN discovery to work.

## Environment Configuration

Edit `.env` to customize:

```bash
# Server
PORT=3000
NODE_ENV=production

# Network Scanning
SUBNET=                    # Leave empty for auto-detect
SCAN_CONCURRENCY=20        # Parallel probes (10-50)
PROBE_TIMEOUT_MS=2000      # Timeout per probe

# Database
DB_PATH=./data/wiz.db

# Security (optional)
API_SECRET=                # Set to require Bearer token auth

# Logging
LOG_LEVEL=info
```

## API Documentation

### Devices

```bash
# Get all devices
GET /api/devices

# Get device by ID
GET /api/devices/:id

# Get device state
GET /api/devices/:id/state

# Set power
POST /api/devices/:id/power
Content-Type: application/json
{ "power": true }

# Set state (brightness, color temp, RGB)
POST /api/devices/:id/state
Content-Type: application/json
{
  "brightness": 80,
  "colorTemp": 4000,
  "rgb": { "r": 255, "g": 128, "b": 0 },
  "power": true
}

# Set scene with speed
POST /api/devices/:id/scene
Content-Type: application/json
{
  "sceneId": 4,    # Scene ID (1-32)
  "speed": 100     # Speed 0-200 (optional, default 100)
}

# Set device metadata
PATCH /api/devices/:id/metadata
Content-Type: application/json
{
  "name": "Living Room Light",
  "room": "Living Room",
  "tags": ["main", "bright"]
}
```

### Scanning

```bash
# Start network scan
POST /api/scan
Content-Type: application/json
{
  "subnet": "192.168.1.0/24",  # Optional
  "concurrency": 20,             # Optional
  "timeout": 2000                # Optional (ms)
}

# Get scan status
GET /api/scan/status
```

### Schedules

```bash
# Get all schedules
GET /api/schedules

# Create schedule
POST /api/schedules
Content-Type: application/json
{
  "name": "Morning Lights",
  "deviceIds": ["device-id-1", "device-id-2"],
  "action": {
    "type": "power",
    "power": true
  },
  "cron": "0 8 * * *",
  "enabled": true
}

# Update schedule
PATCH /api/schedules/:id
Content-Type: application/json
{ "enabled": false }

# Delete schedule
DELETE /api/schedules/:id

# Enable/disable schedule
POST /api/schedules/:id/enable
Content-Type: application/json
{ "enabled": true }

# Trigger schedule immediately
POST /api/schedules/:id/trigger
```

### Groups

```bash
# Get all groups
GET /api/groups

# Get single group with devices
GET /api/groups/:id

# Create group
POST /api/groups
Content-Type: application/json
{
  "name": "Living Room",
  "description": "Main living area lights",
  "color": "#00FFFF",
  "icon": "Home"
}

# Update group
PATCH /api/groups/:id
Content-Type: application/json
{
  "name": "Updated Name",
  "color": "#FF00FF"
}

# Delete group
DELETE /api/groups/:id

# Add devices to group
POST /api/groups/:id/devices
Content-Type: application/json
{
  "deviceIds": ["device-1", "device-2"]
}

# Remove device from group
DELETE /api/groups/:id/devices/:deviceId

# Control group power
POST /api/groups/:id/power
Content-Type: application/json
{
  "power": true
}

# Control group state
POST /api/groups/:id/state
Content-Type: application/json
{
  "brightness": 80,
  "colorTemp": 4000,
  "rgb": { "r": 255, "g": 0, "b": 128 }
}
```

### WebSocket Events

Connect to `ws://localhost:3000` (Socket.IO):

**Client → Server:**
- `devices:refresh` - Request device state refresh

**Server → Client:**
- `devices:initial` - Initial device list on connection
- `devices:updated` - Bulk device state update
- `device:discovered` - New device found during scan
- `device:updated` - Device state changed
- `device:removed` - Device removed (stale)
- `group:created` - New group created
- `group:updated` - Group modified or devices changed
- `group:deleted` - Group removed
- `scan:progress` - Scan progress update
- `scan:complete` - Scan finished
- `schedule:triggered` - Schedule executed

## CLI Scanner

Standalone scanner for quick network discovery:

```bash
# Scan with auto-detect subnet
npm run cli:scan

# Scan specific subnet
npm run cli:scan -- --subnet=192.168.1.0/24

# Output is JSON for easy parsing
```

## Cron Expression Guide

Format: `minute hour day month weekday`

Examples:
- `0 8 * * *` - Every day at 8:00 AM
- `30 20 * * *` - Every day at 8:30 PM
- `0 */2 * * *` - Every 2 hours
- `0 7 * * 1-5` - Weekdays at 7:00 AM
- `0 22 * * 6,0` - Weekends at 10:00 PM

Online tool: [crontab.guru](https://crontab.guru/)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Troubleshooting

### No Devices Found

1. **Check network connectivity**: Ensure the server is on the same LAN as bulbs
2. **Verify subnet**: Use `ip route` (Linux) or `ipconfig` (Windows) to confirm your subnet
3. **Firewall**: Ensure UDP port 38899 is not blocked
4. **Bulb connectivity**: Verify bulbs are powered on and connected to WiFi
5. **Increase timeout**: Set `PROBE_TIMEOUT_MS=5000` in `.env`

### Scan Takes Too Long

1. **Reduce concurrency**: Set `SCAN_CONCURRENCY=10`
2. **Narrow subnet**: Scan smaller ranges (e.g., /28 instead of /24)
3. **Check network speed**: Slow networks benefit from lower concurrency

### Docker Network Issues

On Linux, use `--network host`:
```bash
docker run --network host wiz-lan-controller
```

On Windows/Mac, use bridge networking and port mapping:
```bash
docker run -p 3000:3000 wiz-lan-controller
```

### Schedules Not Triggering

1. **Check enabled status**: Ensure schedule is enabled in UI
2. **Verify cron syntax**: Test at [crontab.guru](https://crontab.guru/)
3. **Check timezone**: Server uses system timezone
4. **Review logs**: Check console output for schedule execution

## WIZ Protocol

### Overview
WIZ bulbs communicate via JSON-RPC over UDP/TCP on port 38899.

### Discovery
Send UDP broadcast to `255.255.255.255:38899` or probe individual IPs.

### Commands
See `docs/PROTOCOL.md` for detailed protocol documentation.

Example request:
```json
{"method": "getPilot", "params": {}}
```

Example response:
```json
{
  "method": "getPilot",
  "result": {
    "mac": "a8fae00xxxxx",
    "rssi": -54,
    "state": true,
    "sceneId": 0,
    "temp": 4000,
    "dimming": 100
  }
}
```

## Database Schema

The application uses SQLite with the following tables:

### devices
Stores discovered WIZ devices with persistence across restarts.
- `id` (PRIMARY KEY) - Device identifier (MAC or IP-based)
- `ip` - Current IP address
- `mac` - MAC address
- `name` - User-assigned name
- `model` - Device model
- `confidence` - Detection confidence (high/medium/low)
- `rssi` - Signal strength
- `state` (JSON) - Current device state (power, brightness, color, etc.)
- `last_seen` - Last contact timestamp
- `created_at` - Discovery timestamp
- `updated_at` - Last update timestamp

### device_metadata
User-defined metadata for devices.
- `device_id` (PRIMARY KEY) - References devices.id
- `name` - Display name
- `room` - Room location
- `icon` - Icon identifier
- `tags` (JSON) - Custom tags array

### groups
Device groups for multi-device control.
- `id` (PRIMARY KEY) - Group identifier
- `name` - Group name
- `description` - Group description
- `color` - Hex color code for UI
- `icon` - Icon identifier
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### device_groups
Many-to-many relationship between devices and groups.
- `device_id` - References devices.id
- `group_id` - References groups.id
- `added_at` - Association timestamp
- PRIMARY KEY (device_id, group_id)

### schedules
Cron-based automation rules.
- `id` (PRIMARY KEY) - Schedule identifier
- `name` - Schedule name
- `device_ids` (JSON) - Target device IDs
- `action` (JSON) - Action to perform
- `cron` - Cron expression
- `enabled` - Active status
- `timezone` - Timezone identifier
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Security Best Practices

1. **Network Isolation**: Run scanner on dedicated management network
2. **Authentication**: Set `API_SECRET` in production environments
3. **Firewall Rules**: Restrict access to port 3000
4. **HTTPS**: Use reverse proxy (nginx, Caddy) for HTTPS in production
5. **Regular Updates**: Keep dependencies updated with `npm audit`
6. **Limited Scanning**: Scan only when necessary, not continuously

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure `npm test` passes
5. Submit a pull request

## Project Structure

```
wiz-lan-controller/
├── src/
│   ├── server/
│   │   ├── index.ts              # Express server + Socket.IO
│   │   ├── scanner.ts            # Network discovery engine
│   │   ├── wiz-client.ts         # WIZ protocol implementation
│   │   ├── database.ts           # SQLite persistence
│   │   ├── scheduler.ts          # Cron-based automation
│   │   ├── utils/
│   │   │   └── network.ts        # Network utilities (CIDR, etc.)
│   │   └── __tests__/            # Backend tests
│   ├── shared/
│   │   └── types.ts              # Shared TypeScript interfaces
│   └── cli/
│       └── scanner-cli.ts        # CLI scanner tool
├── frontend/
│   ├── src/
│   │   ├── pages/                # React pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks (WebSocket)
│   │   ├── lib/                  # API client
│   │   └── index.css             # Tailwind styles
│   ├── public/                   # Static assets
│   └── vite.config.ts            # Vite configuration
├── data/                         # SQLite database (gitignored)
├── .env.example                  # Environment template
├── docker-compose.yml            # Docker Compose config
├── Dockerfile                    # Multi-stage Docker build
└── README.md                     # This file
```

## Acknowledgments

- **WIZ Connected**: For creating great smart bulbs with local control
- **Open Source Community**: For the excellent libraries powering this project

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
1. Check existing issues
2. Review troubleshooting guide
3. Create a new issue with:
   - Environment details (OS, Node version)
   - Steps to reproduce
   - Expected vs. actual behavior

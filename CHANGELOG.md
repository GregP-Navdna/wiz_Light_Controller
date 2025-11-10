# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-09

### Added

#### Backend
- Network scanner with multi-heuristic device discovery
  - ARP table inspection for MAC address detection
  - MAC OUI vendor lookup for device identification
  - UDP port 38899 probe for WIZ protocol validation
  - Confidence scoring (high/medium/low) for discovered devices
  - Configurable concurrency and timeouts
- WIZ local protocol implementation (UDP port 38899)
  - Device state retrieval (power, brightness, color temp, RGB)
  - Device control commands (power, brightness, color temp, RGB, scenes)
  - System configuration queries
- RESTful API with Express
  - Device management endpoints
  - Network scanning endpoints
  - Schedule management endpoints
  - Metadata management
- Real-time WebSocket communication with Socket.IO
  - Live device discovery events
  - Device state update notifications
  - Scan progress tracking
  - Schedule trigger notifications
- SQLite database with better-sqlite3
  - Persistent schedule storage
  - Device metadata storage
  - Migration support
- Cron-based scheduling system with node-schedule
  - Power on/off scheduling
  - State change scheduling
  - Enable/disable schedules
  - Manual trigger support
  - Timezone-aware execution
- Environment-based configuration
  - Configurable ports, timeouts, concurrency
  - Optional API authentication
  - Database path configuration
- CLI scanner utility
  - Standalone network scanning tool
  - JSON output for scripting
  - Progress reporting

#### Frontend
- Modern React 18 application with TypeScript
  - Vite for fast development and building
  - React Router for navigation
  - TanStack Query for data fetching
  - Socket.IO client for real-time updates
- Device management page
  - Live device grid with cards
  - Individual device controls
  - Power toggle buttons
  - Brightness sliders
  - Color temperature controls
  - Confidence badges
  - Auto-refresh via WebSocket
- Network scanner page
  - Interactive scan configuration
  - Real-time progress visualization
  - Subnet configuration (auto-detect or manual)
  - Concurrency adjustment
  - Device list with status indicators
- Scheduler page
  - Schedule creation form
  - Device selection interface
  - Cron expression editor with hints
  - Schedule list with enable/disable
  - Manual trigger buttons
  - Delete functionality
- Dark theme by default with Tailwind CSS
  - Modern, clean UI design
  - Responsive mobile-friendly layout
  - Lucide React icons
  - Custom color scheme based on shadcn/ui

#### Infrastructure
- Docker support
  - Multi-stage Dockerfile
  - docker-compose configuration
  - Health checks
  - Volume mounting for persistence
- Comprehensive test suite
  - Jest configuration for TypeScript
  - Unit tests for network utilities
  - Integration test templates
- Complete documentation
  - Detailed README with setup instructions
  - WIZ protocol documentation
  - API examples in multiple languages
  - Contributing guidelines
  - Security best practices

### Security
- Optional API authentication with bearer tokens
- Network scanning warnings and legal notices
- Input validation on all endpoints
- Safe SQL queries with prepared statements
- Error handling without information leakage

### Performance
- Concurrent network scanning (configurable 5-50 hosts)
- Efficient SQLite operations
- WebSocket for reduced polling
- Client-side state caching with React Query
- Optimized build outputs

## [Unreleased]

### Planned Features
- Device grouping functionality
- Scene management UI
- Schedule import/export
- Device naming and room assignment
- Advanced color picker for RGB control
- Schedule templates
- Dark/light theme toggle
- Multi-language support
- Mobile app (future consideration)

### Known Issues
- Docker networking requires host mode on Linux for optimal discovery
- Large subnet scans (/16 or larger) may be slow on some networks
- No cloud integration (by design - local control only)
- Scene IDs are hardcoded (no dynamic scene creation yet)

---

## Release History

### Version Numbering
- **Major**: Breaking API or protocol changes
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes, minor improvements

### Support
- Latest version receives active support
- Security fixes backported to previous minor version
- Documentation updated with each release

For detailed commit history, see the Git log.

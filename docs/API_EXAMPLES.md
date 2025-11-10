# API Examples

Complete examples for interacting with the WIZ LAN Controller API.

## Base URL

```
http://localhost:3000/api
```

## Authentication (Optional)

If `API_SECRET` is set in `.env`:

```bash
curl -H "Authorization: Bearer YOUR_SECRET_TOKEN" http://localhost:3000/api/devices
```

## Device Control Examples

### 1. List All Devices

```bash
curl http://localhost:3000/api/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "a8fae00xxxxx",
      "ip": "192.168.1.100",
      "mac": "a8:fa:e0:0x:xx:xx",
      "confidence": "high",
      "lastSeen": 1699564800000,
      "state": {
        "power": true,
        "brightness": 80,
        "colorTemp": 4000
      }
    }
  ]
}
```

### 2. Get Specific Device

```bash
curl http://localhost:3000/api/devices/a8fae00xxxxx
```

### 3. Turn Device On

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/power \
  -H "Content-Type: application/json" \
  -d '{"power": true}'
```

### 4. Turn Device Off

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/power \
  -H "Content-Type: application/json" \
  -d '{"power": false}'
```

### 5. Set Brightness (50%)

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/state \
  -H "Content-Type: application/json" \
  -d '{
    "brightness": 50,
    "power": true
  }'
```

### 6. Set Color Temperature (Warm White - 2700K)

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/state \
  -H "Content-Type: application/json" \
  -d '{
    "colorTemp": 2700,
    "power": true
  }'
```

### 7. Set RGB Color (Red)

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/state \
  -H "Content-Type: application/json" \
  -d '{
    "rgb": {
      "r": 255,
      "g": 0,
      "b": 0
    },
    "power": true
  }'
```

### 8. Set Multiple Parameters

```bash
curl -X POST http://localhost:3000/api/devices/a8fae00xxxxx/state \
  -H "Content-Type: application/json" \
  -d '{
    "power": true,
    "brightness": 75,
    "colorTemp": 4000
  }'
```

### 9. Set Device Metadata

```bash
curl -X PATCH http://localhost:3000/api/devices/a8fae00xxxxx/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Living Room Lamp",
    "room": "Living Room",
    "tags": ["main", "bright"]
  }'
```

## Network Scanning Examples

### 1. Start Scan (Auto-detect Subnet)

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Start Scan (Specific Subnet)

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "subnet": "192.168.1.0/24",
    "concurrency": 20,
    "timeout": 2000
  }'
```

### 3. Check Scan Status

```bash
curl http://localhost:3000/api/scan/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scanning": false
  }
}
```

## Schedule Management Examples

### 1. List All Schedules

```bash
curl http://localhost:3000/api/schedules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "name": "Morning Lights",
      "deviceIds": ["device1", "device2"],
      "action": {
        "type": "power",
        "power": true
      },
      "cron": "0 7 * * *",
      "enabled": true,
      "createdAt": 1699564800000,
      "updatedAt": 1699564800000
    }
  ]
}
```

### 2. Create Schedule (Turn On at 7 AM Daily)

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Lights",
    "deviceIds": ["a8fae00xxxxx"],
    "action": {
      "type": "power",
      "power": true
    },
    "cron": "0 7 * * *",
    "enabled": true
  }'
```

### 3. Create Schedule (Turn Off at 11 PM Daily)

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Night Off",
    "deviceIds": ["a8fae00xxxxx"],
    "action": {
      "type": "power",
      "power": false
    },
    "cron": "0 23 * * *",
    "enabled": true
  }'
```

### 4. Create Schedule (Dim at Sunset)

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunset Dim",
    "deviceIds": ["a8fae00xxxxx"],
    "action": {
      "type": "setState",
      "state": {
        "brightness": 30,
        "colorTemp": 2700,
        "power": true
      }
    },
    "cron": "0 18 * * *",
    "enabled": true
  }'
```

### 5. Create Schedule (Weekday Morning)

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekday Morning",
    "deviceIds": ["a8fae00xxxxx"],
    "action": {
      "type": "power",
      "power": true
    },
    "cron": "0 6 * * 1-5",
    "enabled": true
  }'
```

### 6. Update Schedule

```bash
curl -X PATCH http://localhost:3000/api/schedules/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Morning Lights",
    "cron": "30 7 * * *"
  }'
```

### 7. Enable/Disable Schedule

```bash
curl -X POST http://localhost:3000/api/schedules/abc123/enable \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 8. Trigger Schedule Immediately

```bash
curl -X POST http://localhost:3000/api/schedules/abc123/trigger
```

### 9. Delete Schedule

```bash
curl -X DELETE http://localhost:3000/api/schedules/abc123
```

## JavaScript/Node.js Examples

### Using Fetch API

```javascript
// List devices
const response = await fetch('http://localhost:3000/api/devices');
const { data } = await response.json();
console.log('Devices:', data);

// Turn on device
await fetch('http://localhost:3000/api/devices/a8fae00xxxxx/power', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ power: true })
});

// Set brightness
await fetch('http://localhost:3000/api/devices/a8fae00xxxxx/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ brightness: 75, power: true })
});
```

### Using Axios

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' }
});

// List devices
const devices = await api.get('/devices');
console.log(devices.data);

// Control device
await api.post('/devices/a8fae00xxxxx/power', { power: true });

// Create schedule
await api.post('/schedules', {
  name: 'Morning Routine',
  deviceIds: ['a8fae00xxxxx'],
  action: { type: 'power', power: true },
  cron: '0 7 * * *',
  enabled: true
});
```

## Python Examples

### Using Requests Library

```python
import requests

BASE_URL = 'http://localhost:3000/api'

# List devices
response = requests.get(f'{BASE_URL}/devices')
devices = response.json()['data']
print(devices)

# Turn on device
requests.post(
    f'{BASE_URL}/devices/a8fae00xxxxx/power',
    json={'power': True}
)

# Set brightness
requests.post(
    f'{BASE_URL}/devices/a8fae00xxxxx/state',
    json={'brightness': 75, 'power': True}
)

# Create schedule
requests.post(
    f'{BASE_URL}/schedules',
    json={
        'name': 'Morning Lights',
        'deviceIds': ['a8fae00xxxxx'],
        'action': {'type': 'power', 'power': True},
        'cron': '0 7 * * *',
        'enabled': True
    }
)
```

## WebSocket Examples

### JavaScript (Socket.IO)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Listen for device updates
socket.on('device:discovered', (data) => {
  console.log('New device:', data.device);
});

socket.on('device:updated', (data) => {
  console.log('Device updated:', data.device);
});

socket.on('scan:progress', (progress) => {
  console.log(`Scan progress: ${progress.progress}%`);
});

socket.on('scan:complete', (data) => {
  console.log('Scan complete, devices:', data.devices);
});

// Request device refresh
socket.emit('devices:refresh');
```

## Common Use Cases

### 1. Turn All Devices On

```bash
#!/bin/bash
DEVICES=$(curl -s http://localhost:3000/api/devices | jq -r '.data[].id')

for device in $DEVICES; do
  curl -X POST http://localhost:3000/api/devices/$device/power \
    -H "Content-Type: application/json" \
    -d '{"power": true}'
done
```

### 2. Set All Devices to Same Brightness

```bash
#!/bin/bash
BRIGHTNESS=50
DEVICES=$(curl -s http://localhost:3000/api/devices | jq -r '.data[].id')

for device in $DEVICES; do
  curl -X POST http://localhost:3000/api/devices/$device/state \
    -H "Content-Type: application/json" \
    -d "{\"brightness\": $BRIGHTNESS, \"power\": true}"
done
```

### 3. Create Morning and Night Schedules

```bash
# Morning: Turn on at 7 AM
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning On",
    "deviceIds": ["device1", "device2"],
    "action": {"type": "power", "power": true},
    "cron": "0 7 * * *",
    "enabled": true
  }'

# Night: Turn off at 11 PM
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Night Off",
    "deviceIds": ["device1", "device2"],
    "action": {"type": "power", "power": false},
    "cron": "0 23 * * *",
    "enabled": true
  }'
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Device not found"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid API secret)
- `404` - Not found
- `409` - Conflict (e.g., scan already in progress)
- `500` - Internal server error

## Rate Limiting

No rate limiting is enforced by default. For production:
- Recommended: Max 100 requests/minute per client
- Device commands: Max 10/second per device
- Scans: Max 1 concurrent scan

## Tips

1. **Bulk Operations**: Use WebSocket for real-time updates during bulk operations
2. **Error Recovery**: Implement retry logic with exponential backoff
3. **State Caching**: Cache device states locally to reduce API calls
4. **Scheduling**: Use server-side schedules instead of client-side polling
5. **Discovery**: Run scans during off-peak hours for large networks

---

For more examples, see the source code in `src/server/index.ts` and frontend API client in `frontend/src/lib/api.ts`.

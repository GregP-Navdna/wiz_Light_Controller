# WIZ Local Control Protocol

## Overview

WIZ Connected bulbs support local control via a JSON-RPC-style protocol over UDP/TCP on port **38899**. This document describes the protocol structure and available commands.

## Connection

- **Protocol**: UDP (primary) or TCP
- **Port**: 38899
- **Format**: JSON
- **Encoding**: UTF-8

## Message Structure

### Request Format

```json
{
  "method": "methodName",
  "params": {
    "key": "value"
  }
}
```

### Response Format

```json
{
  "method": "methodName",
  "env": "pro",
  "result": {
    "success": true,
    "data": "..."
  },
  "error": {
    "code": 1000,
    "message": "Error description"
  }
}
```

## Discovery

### Broadcast Discovery

Send UDP packet to broadcast address `255.255.255.255:38899`:

```json
{
  "method": "getPilot",
  "params": {}
}
```

Devices will respond with their current state.

### Direct Probe

Send directly to a known IP address to check if it's a WIZ device.

## Core Methods

### 1. getPilot - Get Device State

**Request:**
```json
{
  "method": "getPilot",
  "params": {}
}
```

**Response:**
```json
{
  "method": "getPilot",
  "result": {
    "mac": "a8fae00xxxxx",
    "rssi": -54,
    "state": true,
    "sceneId": 0,
    "speed": 100,
    "temp": 4000,
    "dimming": 100,
    "r": 255,
    "g": 128,
    "b": 0,
    "c": 0,
    "w": 255
  }
}
```

**Fields:**
- `mac`: MAC address of device
- `rssi`: WiFi signal strength (dBm)
- `state`: Power state (true = on, false = off)
- `sceneId`: Active scene ID (if any)
- `speed`: Animation speed (0-200, default 100)
- `temp`: Color temperature in Kelvin (2200-6500)
- `dimming`: Brightness percentage (10-100)
- `r`, `g`, `b`: RGB values (0-255)
- `c`, `w`: Cold/Warm white values (0-255)

### 2. setPilot - Set Device State

**Request - Turn On/Off:**
```json
{
  "method": "setPilot",
  "params": {
    "state": true
  }
}
```

**Request - Set Brightness:**
```json
{
  "method": "setPilot",
  "params": {
    "state": true,
    "dimming": 50
  }
}
```

**Request - Set Color Temperature:**
```json
{
  "method": "setPilot",
  "params": {
    "state": true,
    "temp": 4000
  }
}
```

**Request - Set RGB Color:**
```json
{
  "method": "setPilot",
  "params": {
    "state": true,
    "r": 255,
    "g": 0,
    "b": 0
  }
}
```

**Request - Set Scene:**
```json
{
  "method": "setPilot",
  "params": {
    "state": true,
    "sceneId": 6
  }
}
```

**Response:**
```json
{
  "method": "setPilot",
  "result": {
    "success": true
  }
}
```

### 3. getSystemConfig - Get Device Information

**Request:**
```json
{
  "method": "getSystemConfig",
  "params": {}
}
```

**Response:**
```json
{
  "method": "getSystemConfig",
  "result": {
    "mac": "a8fae00xxxxx",
    "homeId": 12345,
    "roomId": 67890,
    "moduleName": "ESP_RGBWW_01",
    "fwVersion": "1.25.0",
    "groupId": 0,
    "drvConf": [20, 20],
    "ewf": [255, 255, 255, 255],
    "ewfHex": "ffffffff",
    "ping": 0
  }
}
```

**Fields:**
- `mac`: MAC address
- `moduleName`: Hardware module name
- `fwVersion`: Firmware version
- `homeId`, `roomId`: WIZ cloud grouping IDs
- `groupId`: Local group ID

### 4. pulse - Temporary State Change

Temporarily change state and revert after a duration.

**Request:**
```json
{
  "method": "pulse",
  "params": {
    "delta": 10,
    "duration": 300,
    "r": 255,
    "g": 0,
    "b": 0
  }
}
```

**Fields:**
- `delta`: Brightness change amount
- `duration`: Duration in milliseconds
- `r`, `g`, `b`: RGB values for pulse color

### 5. registration - Device Registration

Used by WIZ app to register device.

**Request:**
```json
{
  "method": "registration",
  "params": {
    "phoneMac": "AABBCCDDEEFF",
    "register": true,
    "phoneIp": "192.168.1.100"
  }
}
```

## Scene IDs

Common WIZ scene IDs:

| ID | Name |
|----|------|
| 1 | Ocean |
| 2 | Romance |
| 3 | Sunset |
| 4 | Party |
| 5 | Fireplace |
| 6 | Cozy |
| 7 | Forest |
| 8 | Pastel Colors |
| 9 | Wake up |
| 10 | Bedtime |
| 11 | Warm White |
| 12 | Daylight |
| 13 | Cool white |
| 14 | Night light |
| 15 | Focus |
| 16 | Relax |
| 17 | True colors |
| 18 | TV time |
| 19 | Plantgrowth |
| 20 | Spring |
| 21 | Summer |
| 22 | Fall |
| 23 | Deepdive |
| 24 | Jungle |
| 25 | Mojito |
| 26 | Club |
| 27 | Christmas |
| 28 | Halloween |
| 29 | Candlelight |
| 30 | Golden white |
| 31 | Pulse |
| 32 | Steampunk |

## Color Temperature Ranges

- **Warm White**: 2200K - 2700K
- **Soft White**: 2700K - 3000K
- **Neutral White**: 3500K - 4100K
- **Cool White**: 5000K - 6500K

Actual range depends on bulb model. Most support 2200K-6500K.

## Error Codes

Common error codes in responses:

| Code | Meaning |
|------|---------|
| -1 | Invalid parameter |
| -2 | Method not found |
| -3 | Unauthorized |
| -4 | Timeout |
| 1000 | General error |

## Best Practices

### 1. Rate Limiting
- Limit commands to **10 per second per device**
- Use batch operations when possible

### 2. Timeout Handling
- Set socket timeout to **2-5 seconds**
- Retry failed commands up to **3 times**
- Implement exponential backoff

### 3. State Caching
- Cache device states locally
- Refresh every **30-60 seconds**
- Use WebSocket for real-time updates

### 4. Discovery
- Avoid continuous scanning
- Scan only when needed (startup, manual trigger)
- Use **ARP table** for faster initial discovery
- Verify responses before marking as WIZ device

### 5. Error Recovery
- Handle network errors gracefully
- Implement reconnection logic
- Log all protocol errors for debugging

## Security Considerations

### Local Network Only
WIZ bulbs respond to **any** device on the local network. There is no authentication mechanism for local control.

### Implications
1. **No Password**: Anyone on your network can control bulbs
2. **No Encryption**: Commands sent in plain text
3. **Network Isolation**: Consider VLAN isolation for IoT devices
4. **Firewall**: Block external access to port 38899

### Recommendations
- Use WPA3 encryption on WiFi
- Isolate IoT devices on separate network
- Monitor network traffic for unusual patterns
- Disable cloud features if only using local control

## Advanced Topics

### Firmware Updates

Firmware updates are typically delivered via WIZ cloud. Local protocol does not support firmware updates.

### Group Control

Multiple bulbs can be controlled simultaneously by:
1. **Broadcasting**: Send to 255.255.255.255
2. **Multicast**: Use configured groupId
3. **Sequential**: Iterate through device list (slower)

### Custom Scenes

Create custom color sequences by rapidly changing RGB values with delays between commands.

## Example Implementations

### Python

```python
import socket
import json

def send_command(ip, command):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(2)
    
    message = json.dumps(command).encode('utf-8')
    sock.sendto(message, (ip, 38899))
    
    try:
        data, _ = sock.recvfrom(1024)
        return json.loads(data.decode('utf-8'))
    finally:
        sock.close()

# Turn on bulb
response = send_command('192.168.1.100', {
    'method': 'setPilot',
    'params': {'state': True}
})
print(response)
```

### Node.js (from this project)

See `src/server/wiz-client.ts` for complete TypeScript implementation.

## Protocol Limitations

1. **No Authentication**: Open to all network participants
2. **No State Notifications**: Must poll for state changes
3. **No Discovery Response**: Broadcast discovery not guaranteed
4. **Limited Documentation**: Reverse-engineered protocol
5. **Firmware Variations**: Some models may have different fields

## Resources

- **WIZ App**: Official app for comparison testing
- **Wireshark**: Capture UDP traffic on port 38899
- **Community Forums**: Various reverse-engineering efforts online

## Version History

- **v1.x**: Initial protocol (most common)
- **v2.x**: Added extended color modes
- **v3.x**: Enhanced scenes and effects

Check `fwVersion` in `getSystemConfig` to determine device capabilities.

---

**Note**: This documentation is based on reverse engineering and community research. Official WIZ documentation is not publicly available. Behavior may vary by device model and firmware version.

# Device Grouping Feature Implementation

## ✅ Completed

### 1. Database Schema
- **devices table** - Persist all discovered devices with state
- **groups table** - Store group metadata (name, description, color, icon)
- **device_groups table** - Many-to-many junction table
- **Indexes** - For performance on queries

### 2. Database Methods (`database.ts`)
#### Device Persistence:
- `saveDevice(device)` - Upsert device to DB
- `getAllDevices()` - Get all devices with their groups
- `getDevice(deviceId)` - Get single device
- `deleteStaleDevices(threshold)` - Remove old devices

#### Group Management:
- `createGroup(group)` - Create new group
- `getAllGroups()` - List all groups with device counts
- `getGroup(groupId)` - Get group with devices
- `updateGroup(groupId, updates)` - Update group metadata
- `deleteGroup(groupId)` - Delete group (cascades to device_groups)
- `addDeviceToGroup(deviceId, groupId)` - Add device to group
- `removeDeviceFromGroup(deviceId, groupId)` - Remove device from group
- `getDeviceGroups(deviceId)` - Get all groups for a device
- `getGroupDevices(groupId)` - Get all devices in a group

### 3. Scanner Updates (`scanner.ts`)
- Constructor now accepts database instance
- Loads persisted devices on startup
- Saves new devices to DB when discovered
- Updates existing devices in DB
- Updates lastSeen timestamp in DB

### 4. Server Initialization (`index.ts`)
- Database initialized first
- Passed to scanner constructor

## 🚧 TODO - Backend

### 1. Add API Endpoints in `src/server/index.ts`

```typescript
// Group Management
app.get('/api/groups', async (req, res) => {
  // Get all groups
});

app.post('/api/groups', async (req, res) => {
  // Create group
  // Body: { name, description?, color?, icon? }
});

app.get('/api/groups/:id', async (req, res) => {
  // Get single group with devices
});

app.patch('/api/groups/:id', async (req, res) => {
  // Update group
});

app.delete('/api/groups/:id', async (req, res) => {
  // Delete group
});

app.post('/api/groups/:id/devices', async (req, res) => {
  // Add devices to group
  // Body: { deviceIds: string[] }
});

app.delete('/api/groups/:id/devices/:deviceId', async (req, res) => {
  // Remove device from group
});

// Group Control
app.post('/api/groups/:id/power', async (req, res) => {
  // Control power for all devices in group
  // Body: { power: boolean }
});

app.post('/api/groups/:id/state', async (req, res) => {
  // Set state for all devices in group
  // Body: { brightness?, colorTemp?, rgb? }
});
```

### 2. Add WebSocket Events
```typescript
// Emit when groups change
io.emit('groups:updated', groups);
io.emit('group:created', { group });
io.emit('group:updated', { group });
io.emit('group:deleted', { groupId });
```

## 🚧 TODO - Frontend

### 1. Update Shared Types (`src/shared/types.ts`)
```typescript
export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  deviceCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeviceGroupDetail extends DeviceGroup {
  devices: string[]; // device IDs
}
```

### 2. Update API Client (`frontend/src/lib/api.ts`)
```typescript
// Add groups API
export const groupsApi = {
  getAll: () => axios.get('/api/groups'),
  getOne: (id: string) => axios.get(`/api/groups/${id}`),
  create: (data) => axios.post('/api/groups', data),
  update: (id: string, data) => axios.patch(`/api/groups/${id}`, data),
  delete: (id: string) => axios.delete(`/api/groups/${id}`),
  addDevices: (id: string, deviceIds: string[]) => 
    axios.post(`/api/groups/${id}/devices`, { deviceIds }),
  removeDevice: (id: string, deviceId: string) => 
    axios.delete(`/api/groups/${id}/devices/${deviceId}`),
  setPower: (id: string, power: boolean) => 
    axios.post(`/api/groups/${id}/power`, { power }),
  setState: (id: string, state) => 
    axios.post(`/api/groups/${id}/state`, state),
};
```

### 3. Create Groups Page (`frontend/src/pages/GroupsPage.tsx`)
- List all groups as cards
- Show device count per group
- Create new group button/modal
- Group control interface (power, brightness, etc.)
- Edit/delete group actions

### 4. Create Group Card Component (`frontend/src/components/GroupCard.tsx`)
- Similar to DeviceCard but for groups
- Show group name, description, device count
- Control buttons for group
- Click to expand and show devices

### 5. Update DeviceCard Component
- Show group badges on each device
- Quick add/remove from group dropdown

### 6. Update Navigation (`App.tsx`)
- Add "Groups" tab/link

### 7. Group Creation Modal
- Form with name, description, color picker, icon selector
- Device multi-select checkbox list

## 📊 Features

### Group Control Logic
When controlling a group:
1. Get all device IDs in the group
2. Send command to each device in parallel
3. Handle failures gracefully (log errors but continue)
4. Return summary of successes/failures

### Color Coding
Suggested colors for groups:
- `#00FFFF` - Cyan (default)
- `#FF00FF` - Magenta
- `#FF1493` - Hot Pink
- `#39FF14` - Neon Green
- `#FF6600` - Neon Orange

### Icons
Suggested group icons (using lucide-react):
- `Home` - Home/All Lights
- `Sun` - Daylight/Bright
- `Moon` - Evening/Dim
- `Zap` - Quick Actions
- `Users` - Living Room/Social
- `BedDouble` - Bedroom
- `UtensilsCrossed` - Kitchen/Dining

## 🎨 UI Design Notes

### Groups Page Layout
```
┌─────────────────────────────────────────┐
│  GROUPS                  [+ NEW GROUP]  │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │  Living Room │  │  All Lights  │   │
│  │  ◉ 5 devices │  │  ◉ 12 devices│   │
│  │  [ON] [OFF]  │  │  [ON] [OFF]  │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  Bedroom     │  │  Evening     │   │
│  │  ◉ 3 devices │  │  ◉ 8 devices │   │
│  │  [ON] [OFF]  │  │  [ON] [OFF]  │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘
```

### Device Card with Groups
```
┌─────────────────────────────────────┐
│  💡 Living Room Lamp              ↗ │
│  192.168.1.100                      │
│  Groups: [Living Room] [Evening]    │
│  ────────────────────────────────── │
│  [POWER ON]                         │
│  Brightness: ▓▓▓▓▓▓░░░░ 60%        │
└─────────────────────────────────────┘
```

## 🔄 Next Steps

1. Add API endpoints for groups (backend)
2. Add WebSocket events for groups (backend)
3. Test group control logic with multiple devices
4. Create frontend components
5. Update UI to show groups
6. Add group assignment UI on device cards
7. Test full workflow

## 💾 Data Flow

```
User creates group → API → DB (groups table)
User adds devices to group → API → DB (device_groups table)
User controls group → API → Get devices → WizClient → Send to all bulbs
Scanner discovers device → Save to DB → Load groups → Show in UI
```

## 🎯 Benefits

- **Persistent Storage**: Devices survive server restarts
- **Multi-Device Control**: Control multiple bulbs at once
- **Flexible Grouping**: Devices can be in multiple groups
- **Organized UI**: Logical grouping for better UX
- **Scheduling**: Can schedule groups (future enhancement)

# WebApiDev_Test - Project Documentation

## Project Overview
Minimal Express.js API serving Sri Lankan geographic and vehicle tracking data from `seed.json`.

## Tech Stack
- Node.js + Express.js
- In-memory data from `seed.json` (loaded at startup)
- No database, no authentication

## File Structure
```
WebApiDev_Test/
├── index.js          # Entry point
├── routes.js         # All route handlers
├── seed.json         # Data source (provinces, districts, stations, vehicles, pings)
├── package.json      # Dependencies & scripts
└── package-lock.json
```

## Routes Implemented

### Root
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check - returns `{status: 'ok', session: 'NB6007CEM S2'}` |

### Provinces
| Method | Path | Description |
|--------|------|-------------|
| GET | `/provinces` | List all 9 provinces |
| GET | `/provinces/:provinceId` | Get single province by ID |

### Districts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/districts` | List all 25 districts |
| GET | `/districts/:districtId` | Get single district by ID |

### Stations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stations` | List all 32 police stations |
| GET | `/stations/:stationId` | Get single station by ID |

### Vehicles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/vehicles` | List all 220 vehicles |
| GET | `/vehicles/:vehicleId` | **Composite** - vehicle + most recent ping (`last_ping`) |
| GET | `/vehicles/:vehicleId/pings` | List all pings for a vehicle |
| GET | `/vehicles/:vehicleId/last-position` | **Position only** - most recent ping (404 if none) |

## Vehicle Composite Response (`GET /vehicles/:vehicleId`)
```json
{
  "vehicle_id": "string",
  "reg_number": "string",
  "device_id": "string",
  "station_id": "string",
  "last_ping": {
    "ping_id": "string",
    "vehicle_id": "string",
    "timestamp": "ISO 8601",
    "lat": "number",
    "lng": "number",
    "speed": null
  } | null
}
```

## Last Position Response (`GET /vehicles/:vehicleId/last-position`)
```json
{
  "vehicle_id": "string",
  "timestamp": "ISO 8601",
  "lat": "number",
  "lng": "number",
  "speed": null
}
```

## Commands
```bash
npm install    # Install dependencies
npm start      # Start server on port 3000
```

## Git History (dev branch)
- `S4: Add /last-position` - Added position-only endpoint
- `S4 Upgrade the vehicle composite` - Enhanced vehicle endpoint with last_ping
- `Add routes module with REST endpoints...` - Modularized routes into routes.js
- `S2: hello-world app` - Initial Express app with root endpoint

## Data Notes
- **Speed** is `null` in all responses (not present in seed.json)
- All IDs returned as strings per spec
- Pings sorted by timestamp descending to find "most recent"
- 404 returned for non-existent resources or vehicles with no pings
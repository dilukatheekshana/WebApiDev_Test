# WebApiDev_Test - Project Documentation

## Project Overview
Minimal Express.js API serving Sri Lankan geographic and vehicle tracking data from `seed.json`.

## Tech Stack
- Node.js + Express.js
- In-memory data from `seed.json` (loaded at startup)
- Single-file routes configuration (`routes.js`)
- API Key authentication for ping creation (simulated via header validation)

## File Structure
```
WebApiDev_Test/
├── index.js          # Entry point and server initialization
├── routes.js         # REST route handlers and business logic
├── seed.json         # Data source containing provinces, districts, stations, vehicles, and pings
├── test.json         # Sample payload for testing ping creation
├── package.json      # Project dependencies and npm scripts
├── package-lock.json # Dependency lockfile
├── PROJECT.md        # Project documentation and API specification
└── README.md         # Student and course info
```

## Commands
To install dependencies and run the server:
```bash
npm install    # Install dependencies
npm start      # Start server on port 3000 (or $PORT)
```


## Routes Implemented (Current MVP)

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
| POST | `/vehicles/:vehicleId/pings` | **Create ping** - requires `X-API-Key` header, validates against deviceKeys |
| GET | `/vehicles/:vehicleId/last-position` | **Position only** - most recent ping (404 if none) |
| GET | `/vehicles/:vehicleId/pings/:pingId` | Get single ping by ID |

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

## Create Ping Request (`POST /vehicles/:vehicleId/pings`)
**Headers:**
- `X-API-Key`: Required, must match `deviceKeys[vehicleId]` (e.g., `key_v01`)

**Body:**
```json
{
  "latitude": 7.1,
  "longitude": 80.1,
  "speed": 45
}
```

**Success (201):**
```json
{
  "ping_id": 123,
  "vehicle_id": "1",
  "latitude": 7.1,
  "longitude": 80.1,
  "speed": 45,
  "timestamp": "2026-07-05T10:30:00.000Z"
}
```
**Response Headers:**
- `Location: /vehicles/1/pings/123`
- `ETag: "123"`
- `Last-Modified: Sun, 05 Jul 2026 10:30:00 GMT`

**Errors:**
- 401: Missing X-API-Key header
- 403: Invalid API key
- 404: Vehicle not found
- 400: Missing latitude, longitude, or speed

## Get Ping by ID (`GET /vehicles/:vehicleId/pings/:pingId`)
**Success (200):**
```json
{
  "id": 123,
  "vehicle_id": 1,
  "latitude": 7.1,
  "longitude": 80.1,
  "timestamp": "2026-07-05T10:30:00.000Z"
}
```
**Error (404):**
```json
{ "error": "Not found" }
```

## Git History (dev branch)
| Commit | Message | Date |
|--------|---------|------|
| `7b59092` | S7: Add POST /vehicles/:vehicleId/pings with API key auth and GET /vehicles/:vehicleId/pings/:pingId | 2026-07-05 |
| `3cca95e` | docs: Add PROJECT.md and taxiProject.md | 2026-07-05 |
| `578aa0b` | S4: Add /last-position | 2026-07-05 |
| `053de4e` | S4 Upgrade the vehicle composite | 2026-07-05 |
| `67cfc77` | Add routes module with REST endpoints... | 2026-07-05 |
| `cdf655f` | S2: hello-world app | 2026-07-05 |

## Data Notes (Current)
- **Speed** is `null` in all responses (not present in seed.json)
- All IDs returned as strings per spec
- Pings sorted by timestamp descending to find "most recent"
- 404 returned for non-existent resources or vehicles with no pings


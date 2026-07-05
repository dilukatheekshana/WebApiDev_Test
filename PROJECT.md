# WebApiDev_Test - Project Documentation

## Project Overview
Minimal Express.js API serving Sri Lankan geographic and vehicle tracking data from `seed.json`. **Now evolving into a Taxi/Ride-Hailing Platform** (see `taxiProject.md` for full plan).

## Current Tech Stack (MVP)
- Node.js + Express.js
- In-memory data from `seed.json` (loaded at startup)
- No database, no authentication
- Single file routes (`routes.js`)

## Target Tech Stack (Taxi Platform - Planned)
- Node.js + Express.js + WebSocket (ws)
- PostgreSQL + PostGIS (geo queries)
- API Key authentication
- PayHere payment integration
- Modular route structure
- Redis for caching/rate limiting (future)

## File Structure (Current)
```
WebApiDev_Test/
├── index.js          # Entry point
├── routes.js         # All route handlers
├── seed.json         # Data source (provinces, districts, stations, vehicles, pings)
├── package.json      # Dependencies & scripts
├── package-lock.json
├── PROJECT.md        # This file (current project)
└── taxiProject.md    # Taxi platform comprehensive plan
```

## File Structure (Planned - Taxi Platform)
```
WebApiDev_Test/
├── index.js
├── config/
│   ├── database.js
│   ├── payhere.js
│   └── websocket.js
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── drivers.js
│   ├── passengers.js
│   ├── rides.js
│   ├── payments.js
│   ├── vehicles.js
│   ├── geography.js
│   ├── vehicle-types.js
│   ├── fares.js
│   ├── ratings.js
│   └── admin.js
├── services/
│   ├── dispatch.js
│   ├── fare.js
│   ├── location.js
│   ├── payment.js
│   ├── websocket.js
│   └── notification.js
├── models/
├── middleware/
├── migrations/
├── seeds/
├── utils/
├── tests/
└── package.json
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

## Planned Taxi Platform Routes (from taxiProject.md)

### Authentication
- `POST /auth/register/passenger` - Register passenger
- `POST /auth/register/driver` - Register driver
- `POST /auth/login` - Validate API key
- `POST /auth/refresh` - Rotate API key

### Drivers
- `GET /drivers` - List drivers (admin)
- `GET /drivers/:driverId` - Driver profile
- `PATCH /drivers/:driverId/status` - Update availability
- `POST /drivers/:driverId/location` - Update location
- `GET /drivers/nearby` - Find nearby available drivers

### Passengers
- `GET /passengers/:passengerId` - Profile
- `GET /passengers/:passengerId/rides` - Ride history
- `GET /passengers/:passengerId/wallet` - Wallet balance

### Rides (Core)
- `POST /rides` - Request ride
- `GET /rides/:rideId` - Ride details
- `POST /rides/:rideId/accept` - Driver accepts
- `POST /rides/:rideId/start` - Start trip
- `POST /rides/:rideId/complete` - Complete trip
- `POST /rides/:rideId/cancel` - Cancel ride
- `GET /rides/:rideId/track` - Real-time tracking (WebSocket)

### Payments
- `POST /payments` - PayHere webhook
- `POST /payments/:paymentId/refund` - Refund

### Admin
- `GET /admin/stats` - Dashboard metrics
- `GET /admin/rides` - All rides
- `GET /admin/heatmap` - Demand heatmap

### Fare Estimation
- `POST /fares/estimate` - Estimate fare

### Vehicle Types
- `GET /vehicle-types` - List types with fare rules

## Commands
```bash
npm install    # Install dependencies
npm start      # Start server on port 3000 (or $PORT)
```

## Git History (dev branch)
| Commit | Message | Date |
|--------|---------|------|
| `c8cd5ed` | Add PROJECT.md documentation | 2026-07-05 |
| `578aa0b` | S4: Add /last-position | 2026-07-05 |
| `053de4e` | S4 Upgrade the vehicle composite | 2026-07-05 |
| `67cfc77` | Add routes module with REST endpoints... | 2026-07-05 |
| `cdf655f` | S2: hello-world app | 2026-07-05 |

## Data Notes (Current)
- **Speed** is `null` in all responses (not present in seed.json)
- All IDs returned as strings per spec
- Pings sorted by timestamp descending to find "most recent"
- 404 returned for non-existent resources or vehicles with no pings

## Taxi Platform Technical Decisions (Confirmed)

| Area | Decision |
|------|----------|
| **Real-time** | WebSocket |
| **Payments** | PayHere (Sri Lanka) |
| **Authentication** | API Keys |
| **Database** | PostgreSQL + PostGIS |
| **Business Model** | Ride-hailing platform |
| **Dispatch Logic** | Nearest Available |

## Next Steps
1. Set up PostgreSQL + PostGIS
2. Create database migrations from taxiProject.md schema
3. Implement API key authentication middleware
4. Build modular route structure
5. Implement Phase 1: Foundation (users, drivers, passengers CRUD)
6. Implement Phase 2: Core ride lifecycle with dispatch
7. Integrate PayHere payments
8. Add WebSocket for real-time tracking

## Reference
- **Full taxi platform plan**: `taxiProject.md`
- **Current API docs**: This file (PROJECT.md)
- **Seed data**: `seed.json` (260K+ pings, 220 vehicles, 32 stations, 25 districts, 9 provinces)
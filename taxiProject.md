# Taxi Company REST API - Project Plan

## Executive Summary
Build a ride-hailing platform REST API for a Sri Lankan taxi company with real-time driver tracking, PayHere payments, API key authentication, PostgreSQL/PostGIS database, and nearest-available driver dispatch.

---

## 1. Technical Decisions (Confirmed)

| Area | Decision | Rationale |
|------|----------|-----------|
| **Real-time** | WebSocket | Live driver tracking, passenger ETA updates |
| **Payments** | PayHere | Sri Lanka local gateway, supports cards/wallets |
| **Authentication** | API Keys | Simple, scalable, per-driver/passenger keys |
| **Database** | PostgreSQL + PostGIS | Geo queries, production-ready, ACID |
| **Business Model** | Ride-hailing platform | Multi-driver, passenger-requested rides |
| **Dispatch Logic** | Nearest Available | Simple, fair, efficient for MVP |

---

## 2. Data Model (PostgreSQL Schema)

### 2.1 Core Tables

```sql
-- Users (authentication base)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    license_expiry DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('offline', 'available', 'on_trip', 'on_break')),
    current_location GEOGRAPHY(POINT, 4326),
    heading INTEGER CHECK (heading >= 0 AND heading < 360),
    speed_kmh DECIMAL(5,2),
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_trips INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    shift_start TIME,
    shift_end TIME,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Passengers
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    default_payment_method_id UUID,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles (enhanced from seed.json)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    register_number VARCHAR(20) NOT NULL UNIQUE,
    device_id VARCHAR(50) UNIQUE,
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    station_id UUID REFERENCES stations(id),
    owner_driver_id UUID REFERENCES drivers(id),
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    color VARCHAR(30),
    capacity INTEGER DEFAULT 4,
    features JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Types (fare rules)
CREATE TABLE vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    base_fare DECIMAL(10,2) NOT NULL,
    per_km DECIMAL(10,2) NOT NULL,
    per_min DECIMAL(10,2) NOT NULL,
    min_fare DECIMAL(10,2) NOT NULL,
    capacity INTEGER NOT NULL,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rides/Bookings
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES passengers(id),
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_type_id UUID REFERENCES vehicle_types(id),
    status VARCHAR(30) DEFAULT 'requested' CHECK (status IN (
        'requested', 'searching', 'assigned', 'driver_arrived',
        'in_progress', 'completed', 'cancelled', 'no_driver_found'
    )),
    pickup_address TEXT NOT NULL,
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_district_id INTEGER REFERENCES districts(id),
    dropoff_address TEXT NOT NULL,
    dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_district_id INTEGER REFERENCES districts(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason VARCHAR(255),
    cancel_by VARCHAR(20) CHECK (cancel_by IN ('passenger', 'driver', 'system')),
    distance_km DECIMAL(8,2),
    duration_min INTEGER,
    route_polyline TEXT,
    fare_breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    passenger_id UUID NOT NULL REFERENCES passengers(id),
    driver_id UUID REFERENCES drivers(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LKR',
    method VARCHAR(20) CHECK (method IN ('cash', 'card', 'wallet', 'bank_transfer', 'payhere')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partial_refund')),
    payhere_payment_id VARCHAR(100),
    payhere_order_id VARCHAR(100),
    transaction_ref VARCHAR(100),
    processed_at TIMESTAMPTZ,
    breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver Locations (real-time, high write volume)
CREATE TABLE driver_locations (
    driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    heading INTEGER CHECK (heading >= 0 AND heading < 360),
    speed_kmh DECIMAL(5,2),
    status VARCHAR(20) CHECK (status IN ('available', 'on_trip', 'offline')),
    accuracy_m DECIMAL(5,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings/Reviews
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('driver_to_passenger', 'passenger_to_driver')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ride_id, type)
);

-- Geography (from seed.json)
CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province_id INTEGER NOT NULL REFERENCES provinces(id)
);

CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    district_id INTEGER NOT NULL REFERENCES districts(id),
    location GEOGRAPHY(POINT, 4326)
);

-- Indexes for performance
CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_requested_at ON rides(requested_at);
CREATE INDEX idx_driver_locations_location ON driver_locations USING GIST(location);
CREATE INDEX idx_drivers_status ON drivers(status) WHERE status = 'available';
CREATE INDEX idx_payments_ride ON payments(ride_id);
```

---

## 3. REST API Routes

### 3.1 Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register/passenger` | - | Register passenger, return API key |
| POST | `/auth/register/driver` | - | Register driver (pending verification) |
| POST | `/auth/login` | API Key | Validate key, return user info |
| POST | `/auth/refresh` | API Key | Rotate API key |
| DELETE | `/auth/api-key` | API Key | Revoke current API key |

### 3.2 Drivers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/drivers` | Admin | List drivers (filters: status, vehicle_type, district) |
| GET | `/drivers/:driverId` | Driver/Admin | Get driver profile |
| PATCH | `/drivers/:driverId` | Driver | Update profile (name, shift, vehicle) |
| PATCH | `/drivers/:driverId/status` | Driver | Update availability (available/on_break/offline) |
| GET | `/drivers/:driverId/location` | Driver/Admin | Current location |
| POST | `/drivers/:driverId/location` | Driver | Update location (WebSocket fallback) |
| GET | `/drivers/:driverId/rides` | Driver/Admin | Ride history (paginated) |
| GET | `/drivers/:driverId/earnings` | Driver/Admin | Earnings summary (date range) |
| GET | `/drivers/:driverId/ratings` | Driver/Admin | Ratings summary |
| GET | `/drivers/nearby` | Passenger | Find available drivers near lat/lng |

### 3.3 Passengers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/passengers/:passengerId` | Passenger/Admin | Get profile |
| PATCH | `/passengers/:passengerId` | Passenger | Update profile |
| GET | `/passengers/:passengerId/rides` | Passenger | Ride history |
| GET | `/passengers/:passengerId/payments` | Passenger | Payment history |
| GET | `/passengers/:passengerId/wallet` | Passenger | Wallet balance |
| POST | `/passengers/:passengerId/wallet/topup` | Passenger | Top up via PayHere |
| GET | `/passengers/:passengerId/favorites` | Passenger | Saved locations |
| POST | `/passengers/:passengerId/favorites` | Passenger | Save location |
| DELETE | `/passengers/:passengerId/favorites/:favId` | Passenger | Delete saved location |

### 3.4 Rides (Core)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rides` | Passenger | Request new ride |
| GET | `/rides` | Admin | List all rides (filters) |
| GET | `/rides/:rideId` | Passenger/Driver/Admin | Get ride details |
| PATCH | `/rides/:rideId` | Driver | Update ride status |
| POST | `/rides/:rideId/accept` | Driver | Accept assigned ride |
| POST | `/rides/:rideId/start` | Driver | Start trip (at pickup) |
| POST | `/rides/:rideId/complete` | Driver | Complete trip (at dropoff) |
| POST | `/rides/:rideId/cancel` | Passenger/Driver | Cancel with reason |
| GET | `/rides/:rideId/track` | Passenger/Driver | Real-time tracking (WebSocket) |
| GET | `/rides/:rideId/receipt` | Passenger/Driver | Generate receipt |

### 3.5 Fare Estimation
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/fares/estimate` | Passenger | Estimate fare for route |

### 3.6 Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments` | Webhook | PayHere callback |
| GET | `/payments/:paymentId` | Passenger/Driver/Admin | Payment details |
| POST | `/payments/:paymentId/refund` | Admin | Process refund |

### 3.7 Ratings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rides/:rideId/ratings` | Passenger/Driver | Submit rating |
| GET | `/drivers/:driverId/ratings` | Public | Driver rating summary |
| GET | `/passengers/:passengerId/ratings` | Passenger/Admin | Passenger rating summary |

### 3.8 Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Admin | Dashboard metrics |
| GET | `/admin/rides` | Admin | All rides with filters |
| GET | `/admin/drivers` | Admin | All drivers with filters |
| GET | `/admin/earnings` | Admin | Platform earnings |
| GET | `/admin/heatmap` | Admin | Demand heatmap (geo) |
| PATCH | `/admin/drivers/:driverId/verify` | Admin | Verify/unverify driver |
| PATCH | `/admin/rides/:rideId/reassign` | Admin | Reassign driver |

### 3.9 Vehicle Types
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/vehicle-types` | Public | List active types |
| GET | `/vehicle-types/:typeId` | Public | Get type details |
| POST | `/vehicle-types` | Admin | Create type |
| PATCH | `/vehicle-types/:typeId` | Admin | Update type |

### 3.10 Geography (Existing)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/provinces` | Public | List provinces |
| GET | `/provinces/:provinceId` | Public | Get province |
| GET | `/districts` | Public | List districts |
| GET | `/districts/:districtId` | Public | Get district |
| GET | `/stations` | Public | List stations |
| GET | `/stations/:stationId` | Public | Get station |

### 3.11 Vehicles (Enhanced)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/vehicles` | Admin | List (filters: type, status, driver) |
| GET | `/vehicles/:vehicleId` | Driver/Admin | Composite with last_ping |
| GET | `/vehicles/:vehicleId/pings` | Driver/Admin | All pings |
| GET | `/vehicles/:vehicleId/last-position` | Driver/Admin | Last position only |
| GET | `/vehicles/:vehicleId/driver` | Driver/Admin | Current driver |
| GET | `/vehicles/:vehicleId/rides` | Driver/Admin | Ride history |

---

## 4. Response Standards

### 4.1 Envelope Format
```json
// Single resource
{ "data": {}, "meta": {} }

// Collection
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 100, "total_pages": 5 } }

// Error
{ "error": { "code": "RIDE_NOT_FOUND", "message": "Ride not found", "details": {}, "request_id": "uuid" } }
```

### 4.2 Pagination
```
Query: ?page=1&limit=20&sort=-created_at
```

### 4.3 Filtering Examples
```
GET /rides?status=completed&passenger_id=xxx&from=2026-07-01&to=2026-07-05
GET /drivers?status=available&vehicle_type=car&district_id=1
GET /vehicles?status=active&type=economy
```

### 4.4 Status Codes
| Code | Use |
|------|-----|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Invalid/missing API key |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (ride already assigned) |
| 422 | Business rule violation |
| 429 | Rate limited |
| 500 | Server error |

### 4.5 Headers
```
X-Request-ID: uuid (for tracing)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: unix_timestamp
```

---

## 5. WebSocket Events

### Connection
```
WS /ws?api_key=xxx
```

### Server → Client Events
```json
// Driver location update (to passenger tracking ride)
{ "event": "driver_location", "data": { "ride_id": "uuid", "driver_id": "uuid", "location": { "lat": 6.9271, "lng": 79.8612 }, "heading": 45, "speed_kmh": 35, "timestamp": "2026-07-05T10:30:00Z" } }

// Ride status change
{ "event": "ride_status", "data": { "ride_id": "uuid", "status": "driver_arrived", "timestamp": "2026-07-05T10:30:00Z" } }

// New ride assigned (to driver)
{ "event": "ride_assigned", "data": { "ride_id": "uuid", "pickup": {...}, "passenger": {...} } }

// Ride cancelled
{ "event": "ride_cancelled", "data": { "ride_id": "uuid", "reason": "driver_unavailable", "by": "system" } }
```

### Client → Server Events
```json
// Driver sends location (every 3-5s when on_trip)
{ "event": "location_update", "data": { "lat": 6.9271, "lng": 79.8612, "heading": 45, "speed_kmh": 35 } }

// Passenger subscribes to ride tracking
{ "event": "subscribe_ride", "data": { "ride_id": "uuid" } }

// Driver accepts ride
{ "event": "accept_ride", "data": { "ride_id": "uuid" } }
```

---

## 6. API Key Authentication

### Key Format
```
tk_live_[base64url_encoded]  // Production
tk_test_[base64url_encoded]  // Development
```

### Usage
```
Authorization: Bearer tk_live_xxxxx
// OR
X-API-Key: tk_live_xxxxx
```

### Key Scopes (embedded in key)
- `passenger:read`, `passenger:write`
- `driver:read`, `driver:write`, `driver:location`
- `admin:all`

---

## 7. PayHere Integration

### 7.1 Payment Flow
1. Passenger requests ride → fare estimated
2. On completion → create PayHere payment request
3. Redirect to PayHere or use SDK
4. PayHere callback → `/payments` webhook
5. Update payment status, complete ride

### 7.2 Webhook Payload
```json
{
  "merchant_id": "123456",
  "order_id": "ride_uuid",
  "payment_id": "payhere_payment_id",
  "amount": "435.00",
  "currency": "LKR",
  "status": "2",  // 2 = success
  "md5sig": "verification_hash",
  "custom_1": "passenger_id",
  "custom_2": "driver_id"
}
```

### 7.3 Verification
```javascript
const md5sig = md5(
  merchant_id + order_id + amount + currency + status +
  md5(merchant_secret).toUpperCase()
);
```

---

## 8. Dispatch Algorithm (Nearest Available)

### 8.1 Logic
```javascript
async function findNearestDriver(pickupLat, pickupLng, vehicleTypeId, radiusKm = 5) {
  // 1. Find available drivers within radius
  const drivers = await db.query(`
    SELECT d.*, dl.location,
           ST_Distance(dl.location, ST_MakePoint($1, $2)::geography) / 1000 as distance_km
    FROM drivers d
    JOIN driver_locations dl ON d.id = dl.driver_id
    JOIN vehicles v ON d.vehicle_id = v.id
    WHERE d.status = 'available'
      AND v.vehicle_type_id = $3
      AND ST_DWithin(dl.location, ST_MakePoint($1, $2)::geography, $4 * 1000)
    ORDER BY distance_km ASC
    LIMIT 10
  `, [pickupLng, pickupLat, vehicleTypeId, radiusKm]);

  // 2. Sort by distance, then rating, then acceptance rate
  return drivers.sort((a, b) => {
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.acceptance_rate - a.acceptance_rate;
  })[0];
}
```

### 8.2 Assignment Flow
1. Ride requested → status `searching`
2. Find nearest driver → send `ride_assigned` via WebSocket
3. Driver has 15s to accept → status `assigned`
4. If timeout/no accept → find next nearest
5. If no drivers after 3 attempts → status `no_driver_found`

---

## 9. Fare Calculation

### 9.1 Formula
```
fare = base_fare + (distance_km * per_km) + (duration_min * per_min)
total = fare * surge_multiplier + tax - discount
total = max(total, min_fare)
```

### 9.2 Surge Pricing
- Based on demand/supply ratio in 1km grid
- Multiplier: 1.0x - 3.0x
- Updated every 5 minutes

### 9.3 Example
| Component | Economy | Premium |
|-----------|---------|---------|
| Base Fare | 100.00 | 200.00 |
| Per KM | 40.00 | 60.00 |
| Per Min | 5.00 | 8.00 |
| Min Fare | 150.00 | 300.00 |

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] PostgreSQL + PostGIS setup
- [ ] Database migration scripts
- [ ] Seed data import (provinces, districts, stations, vehicles, vehicle_types)
- [ ] API key auth middleware
- [ ] Basic CRUD for users, drivers, passengers
- [ ] Update PROJECT.md

### Phase 2: Core Rides (Week 2-3)
- [ ] Ride request → dispatch → accept → start → complete
- [ ] Nearest driver search with PostGIS
- [ ] WebSocket server setup
- [ ] Real-time location updates
- [ ] Fare calculation service

### Phase 3: Payments & Ratings (Week 3-4)
- [ ] PayHere integration
- [ ] Payment webhooks
- [ ] Wallet/top-up
- [ ] Bidirectional ratings
- [ ] Receipt generation

### Phase 4: Admin & Analytics (Week 4-5)
- [ ] Admin dashboard APIs
- [ ] Heatmap/demand analytics
- [ ] Earnings reports
- [ ] Driver verification workflow

### Phase 5: Production Ready (Week 5-6)
- [ ] Rate limiting, caching (Redis)
- [ ] Comprehensive tests
- [ ] Monitoring, logging
- [ ] CI/CD pipeline
- [ ] Deployment (Render/Railway → K8s)

---

## 11. File Structure
```
WebApiDev_Test/
├── index.js                      # Entry point
├── config/
│   ├── database.js               # PG pool, migrations
│   ├── payhere.js                # PayHere config
│   └── websocket.js              # WS server config
├── routes/
│   ├── index.js                  # Route registry
│   ├── auth.js                   # Auth routes
│   ├── drivers.js                # Driver routes
│   ├── passengers.js             # Passenger routes
│   ├── rides.js                  # Ride routes
│   ├── payments.js               # Payment routes
│   ├── vehicles.js               # Vehicle routes
│   ├── geography.js              # Province/district/station
│   ├── vehicle-types.js          # Vehicle type catalog
│   ├── fares.js                  # Fare estimation
│   ├── ratings.js                # Ratings
│   └── admin.js                  # Admin routes
├── services/
│   ├── dispatch.js               # Driver matching
│   ├── fare.js                   # Fare calculation
│   ├── location.js               # Geo utilities
│   ├── payment.js                # PayHere integration
│   ├── websocket.js              # WS handlers
│   └── notification.js           # Push/SMS/email
├── models/
│   ├── user.js
│   ├── driver.js
│   ├── passenger.js
│   ├── ride.js
│   ├── payment.js
│   ├── vehicle.js
│   └── rating.js
├── middleware/
│   ├── auth.js                   # API key validation
│   ├── validation.js             # Request validation
│   ├── rateLimit.js              # Rate limiting
│   └── error.js                  # Error handling
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_seed_geography.sql
│   ├── 003_seed_vehicle_types.sql
│   └── 004_indexes.sql
├── seeds/
│   ├── geography.json
│   ├── vehicle_types.json
│   └── demo_data.json
├── utils/
│   ├── geo.js                    # PostGIS helpers
│   ├── crypto.js                 # API key hashing
│   └── helpers.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── PROJECT.md                    # Current project docs
└── taxiProject.md                # This file
```

---

## 12. Environment Variables
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/taxi_db
DB_SSL=false

# PayHere
PAYHERE_MERCHANT_ID=123456
PAYHERE_MERCHANT_SECRET=secret
PAYHERE_SANDBOX=true
PAYHERE_RETURN_URL=https://app.example.com/payment/return
PAYHERE_CANCEL_URL=https://app.example.com/payment/cancel
PAYHERE_NOTIFY_URL=https://api.example.com/payments/webhook

# Auth
API_KEY_SECRET=super_secret_for_hashing
API_KEY_PREFIX=tk

# WebSocket
WS_HEARTBEAT_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External
REDIS_URL=redis://localhost:6379
```

---

## 13. Testing Strategy

### 13.1 Unit Tests
- Fare calculation
- Dispatch algorithm
- Geo utilities
- API key validation

### 13.2 Integration Tests
- Full ride lifecycle
- Payment webhook handling
- WebSocket events
- Admin workflows

### 13.3 Load Tests
- 1000 concurrent drivers sending location
- 100 ride requests/second
- WebSocket connection handling

---

## 14. Monitoring & Observability

### 14.1 Metrics
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Active WebSocket connections
- Ride conversion rate (requested → completed)
- Driver utilization

### 14.2 Logs
- Structured JSON logging
- Request ID correlation
- Audit trail for payments/rides

### 14.3 Alerts
- High error rate
- Database connection pool exhaustion
- PayHere webhook failures
- No available drivers in high-demand areas

---

## 15. Security Considerations

- API keys hashed with bcrypt/scrypt
- Rate limiting per key
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- CORS configured for known origins
- HTTPS enforced in production
- PayHere signature verification
- PII encryption at rest
- Audit logs for admin actions

---

## 16. Future Enhancements (Post-MVP)

- Machine learning dispatch (ETA prediction, demand forecasting)
- Driver app (React Native/Flutter)
- Passenger app (React Native/Flutter)
- Multi-language support (Sinhala, Tamil, English)
- Corporate accounts
- Scheduled rides
- Ride sharing/pooling
- Loyalty program
- Driver documents management
- Insurance integration
- Analytics dashboard (Grafana/Metabase)

---

## 17. Questions Resolved

| Question | Decision | Can Change? |
|----------|----------|-------------|
| Real-time | WebSocket | Yes, before Phase 2 |
| Payments | PayHere | Yes, before Phase 3 |
| Auth | API Keys | Yes, before Phase 1 |
| Database | PostgreSQL + PostGIS | Yes, before Phase 1 |
| Scope | Ride-hailing platform | Yes, affects data model |
| Dispatch | Nearest Available | Yes, before Phase 2 |

---

*Last Updated: 2026-07-05*
*Status: Planning Phase - Ready for Implementation*
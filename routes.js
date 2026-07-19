function basicAuth(req, res, next) {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Police API"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') {
    res.set('WWW-Authenticate', 'Basic realm="Police API"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const credentials = Buffer.from(parts[1], 'base64').toString('utf-8');
  const index = credentials.indexOf(':');
  if (index === -1) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const username = credentials.substring(0, index);
  const password = credentials.substring(index + 1);

  if (username !== 'police' || password !== 'nibm2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

function setupRoutes(app) {
  app.get('/provinces', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const provinces = await db.collection('provinces').find({}, { projection: { _id: 0 } }).toArray();
      res.json(provinces);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/provinces/:provinceId', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const id = parseInt(req.params.provinceId, 10);
      const province = await db.collection('provinces').findOne({ id }, { projection: { _id: 0 } });
      if (!province) return res.status(404).json({ error: 'Not found' });
      res.json(province);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/districts', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const districts = await db.collection('districts').find({}, { projection: { _id: 0 } }).toArray();
      res.json(districts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/districts/:districtId', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const id = parseInt(req.params.districtId, 10);
      const district = await db.collection('districts').findOne({ id }, { projection: { _id: 0 } });
      if (!district) return res.status(404).json({ error: 'Not found' });
      res.json(district);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/stations', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const stations = await db.collection('stations').find({}, { projection: { _id: 0 } }).toArray();
      res.json(stations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/stations/:stationId', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const id = parseInt(req.params.stationId, 10);
      const station = await db.collection('stations').findOne({ id }, { projection: { _id: 0 } });
      if (!station) return res.status(404).json({ error: 'Not found' });
      res.json(station);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/vehicles', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const vehicles = await db.collection('vehicles').find({}, { projection: { _id: 0 } }).toArray();
      res.json(vehicles);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/vehicles/:vehicleId', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const id = parseInt(req.params.vehicleId, 10);
      const vehicle = await db.collection('vehicles').findOne({ id }, { projection: { _id: 0 } });
      if (!vehicle) return res.status(404).json({ error: 'Not found' });

      const lastPing = await db.collection('pings')
        .findOne({ vehicle_id: id }, { sort: { timestamp: -1 }, projection: { _id: 0 } });

      const response = {
        vehicle_id: String(vehicle.id),
        reg_number: vehicle.register_number,
        device_id: vehicle.device_id,
        station_id: String(vehicle.station_id),
        last_ping: lastPing ? {
          ping_id: String(lastPing.id),
          vehicle_id: String(lastPing.vehicle_id),
          timestamp: lastPing.timestamp,
          lat: lastPing.latitude,
          lng: lastPing.longitude,
          speed: null
        } : null
      };

      res.json(response);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/vehicles/:vehicleId/pings', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const vehicleId = parseInt(req.params.vehicleId, 10);
      const pings = await db.collection('pings')
        .find({ vehicle_id: vehicleId }, { projection: { _id: 0 } }).toArray();
      res.json(pings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/vehicles/:vehicleId/last-position', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const vehicleId = parseInt(req.params.vehicleId, 10);
      const lastPing = await db.collection('pings')
        .findOne({ vehicle_id: vehicleId }, { sort: { timestamp: -1 }, projection: { _id: 0 } });
      if (!lastPing) return res.status(404).json({ error: 'Not found' });

      res.json({
        vehicle_id: String(vehicleId),
        timestamp: lastPing.timestamp,
        lat: lastPing.latitude,
        lng: lastPing.longitude,
        speed: null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/vehicles/:vehicleId/pings', async (req, res) => {
    try {
      const db = req.db;
      const vehicleId = req.params.vehicleId;
      const vehicle = await db.collection('vehicles').findOne({ id: parseInt(vehicleId, 10) });
      if (!vehicle) return res.status(404).json({ error: 'Not found' });

      const apiKey = req.get('X-API-Key');
      if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

      const expectedKey = `key_v${String(vehicleId).padStart(2, '0')}`;
      if (expectedKey !== apiKey) return res.status(403).json({ error: 'Invalid API key' });

      const { latitude, longitude, speed } = req.body;
      if (latitude === undefined || longitude === undefined || speed === undefined) {
        return res.status(400).json({ error: 'Missing latitude, longitude, or speed' });
      }

      const timestamp = new Date().toISOString();

      const maxPing = await db.collection('pings').findOne({}, { sort: { id: -1 } });
      const pingId = maxPing ? maxPing.id + 1 : 1;

      const newPing = {
        id: pingId,
        vehicle_id: parseInt(vehicleId, 10),
        latitude,
        longitude,
        timestamp
      };

      await db.collection('pings').insertOne(newPing);

      const location = `/vehicles/${vehicleId}/pings/${pingId}`;
      res.set('Location', location);
      res.set('ETag', `"${pingId}"`);
      res.set('Last-Modified', new Date(timestamp).toUTCString());
      res.status(201).json({ ping_id: pingId, vehicle_id: vehicleId, latitude, longitude, speed, timestamp });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/vehicles/:vehicleId/pings/:pingId', basicAuth, async (req, res) => {
    try {
      const db = req.db;
      const vehicleId = parseInt(req.params.vehicleId, 10);
      const pingId = parseInt(req.params.pingId, 10);
      const ping = await db.collection('pings')
        .findOne({ id: pingId, vehicle_id: vehicleId }, { projection: { _id: 0 } });
      if (!ping) return res.status(404).json({ error: 'Not found' });
      res.json(ping);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}

module.exports = { setupRoutes, basicAuth };
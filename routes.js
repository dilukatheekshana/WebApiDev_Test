const fs = require('fs');
const path = require('path');

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));

const deviceKeys = {};
seedData.vehicles.forEach(v => {
  deviceKeys[String(v.id)] = `key_v${String(v.id).padStart(2, '0')}`;
});
console.log('deviceKeys:', deviceKeys);

function setupRoutes(app) {
  app.get('/provinces', (req, res) => {
    res.json(seedData.provinces);
  });

  app.get('/provinces/:provinceId', (req, res) => {
    const id = parseInt(req.params.provinceId, 10);
    const province = seedData.provinces.find(p => p.id === id);
    if (!province) return res.status(404).json({ error: 'Not found' });
    res.json(province);
  });

  app.get('/districts', (req, res) => {
    res.json(seedData.districts);
  });

  app.get('/districts/:districtId', (req, res) => {
    const id = parseInt(req.params.districtId, 10);
    const district = seedData.districts.find(d => d.id === id);
    if (!district) return res.status(404).json({ error: 'Not found' });
    res.json(district);
  });

  app.get('/stations', (req, res) => {
    res.json(seedData.stations);
  });

  app.get('/stations/:stationId', (req, res) => {
    const id = parseInt(req.params.stationId, 10);
    const station = seedData.stations.find(s => s.id === id);
    if (!station) return res.status(404).json({ error: 'Not found' });
    res.json(station);
  });

  app.get('/vehicles', (req, res) => {
    res.json(seedData.vehicles);
  });

  app.get('/vehicles/:vehicleId', (req, res) => {
    const id = parseInt(req.params.vehicleId, 10);
    const vehicle = seedData.vehicles.find(v => v.id === id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });

    const vehiclePings = seedData.pings
      .filter(p => p.vehicle_id === id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastPing = vehiclePings[0] || null;

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
  });

  app.get('/vehicles/:vehicleId/pings', (req, res) => {
    const vehicleId = parseInt(req.params.vehicleId, 10);
    const pings = seedData.pings.filter(p => p.vehicle_id === vehicleId);
    res.json(pings);
  });

  app.get('/vehicles/:vehicleId/last-position', (req, res) => {
    const vehicleId = parseInt(req.params.vehicleId, 10);
    const vehiclePings = seedData.pings
      .filter(p => p.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastPing = vehiclePings[0];
    if (!lastPing) return res.status(404).json({ error: 'Not found' });

    res.json({
      vehicle_id: String(vehicleId),
      timestamp: lastPing.timestamp,
      lat: lastPing.latitude,
      lng: lastPing.longitude,
      speed: null
    });
  });

  app.post('/vehicles/:vehicleId/pings', (req, res) => {
    const vehicleId = req.params.vehicleId;
    const vehicle = seedData.vehicles.find(v => String(v.id) === vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });

    const apiKey = req.get('X-API-Key');
    if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });
    if (deviceKeys[vehicleId] !== apiKey) return res.status(403).json({ error: 'Invalid API key' });

    const { latitude, longitude, speed } = req.body;
    if (latitude === undefined || longitude === undefined || speed === undefined) {
      return res.status(400).json({ error: 'Missing latitude, longitude, or speed' });
    }

    const timestamp = new Date().toISOString();
    const pingId = seedData.pings.length + 1;
    const newPing = {
      id: pingId,
      vehicle_id: parseInt(vehicleId, 10),
      latitude,
      longitude,
      timestamp
    };
    seedData.pings.push(newPing);

    const location = `/vehicles/${vehicleId}/pings/${pingId}`;
    res.set('Location', location);
    res.set('ETag', `"${pingId}"`);
    res.set('Last-Modified', new Date(timestamp).toUTCString());
    res.status(201).json({ ping_id: pingId, vehicle_id: vehicleId, latitude, longitude, speed, timestamp });
  });

  app.get('/vehicles/:vehicleId/pings/:pingId', (req, res) => {
    const vehicleId = req.params.vehicleId;
    const pingId = parseInt(req.params.pingId, 10);
    const ping = seedData.pings.find(p => p.id === pingId && String(p.vehicle_id) === vehicleId);
    if (!ping) return res.status(404).json({ error: 'Not found' });
    res.json(ping);
  });
}

module.exports = { setupRoutes };
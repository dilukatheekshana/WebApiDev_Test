const fs = require('fs');
const path = require('path');

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));

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
}

module.exports = { setupRoutes };
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
    res.json(vehicle);
  });

  app.get('/vehicles/:vehicleId/pings', (req, res) => {
    const vehicleId = parseInt(req.params.vehicleId, 10);
    const pings = seedData.pings.filter(p => p.vehicle_id === vehicleId);
    res.json(pings);
  });
}

module.exports = { setupRoutes };
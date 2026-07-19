const fs = require('fs');
const path = require('path');
const { connectDB, closeDB } = require('./db');

async function seed() {
  console.log('Starting database seeding...');
  try {
    const db = await connectDB();

    const seedPath = path.join(__dirname, 'seed.json');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.json not found at ${seedPath}`);
    }

    const rawData = fs.readFileSync(seedPath, 'utf8');
    const data = JSON.parse(rawData);

    const keys = ['provinces', 'districts', 'stations', 'vehicles', 'pings'];

    for (const key of keys) {
      if (Array.isArray(data[key])) {
        console.log(`Seeding collection "${key}"...`);
        const collection = db.collection(key);

        // Delete existing documents
        const deleteResult = await collection.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} documents from "${key}".`);

        // Insert new documents if array is not empty
        if (data[key].length > 0) {
          const insertResult = await collection.insertMany(data[key]);
          console.log(`Inserted ${insertResult.insertedCount} documents into "${key}".`);
        }
      } else {
        console.warn(`Warning: Key "${key}" in seed.json is not an array. Skipping.`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await closeDB();
  }
}

seed();

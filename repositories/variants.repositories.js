const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.variants;

const newVariantsRepo = {
   ...baseRepository(collection),
   deleteMany: async (query) => await collection.deleteMany(query, {}),
};

module.exports = newVariantsRepo;

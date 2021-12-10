const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.wireAccount;

const newWireAccountRepo = {
   ...baseRepository(collection),
};

module.exports = newWireAccountRepo;

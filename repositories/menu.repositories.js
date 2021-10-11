const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.menu;

const newMenuRepo = {
	...baseRepository(collection),
};

module.exports = newMenuRepo;

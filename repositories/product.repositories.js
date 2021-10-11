const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.products;
const newProductRepo = {
	...baseRepository(collection),
};

module.exports = newProductRepo;

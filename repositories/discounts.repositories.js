const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.discounts;

const newDiscountsRepo = {
  ...baseRepository(collection),
};

module.exports = newDiscountsRepo;

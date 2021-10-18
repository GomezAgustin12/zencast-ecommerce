const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.pages;

const newPagesRepo = {
  ...baseRepository(collection),
};

module.exports = newPagesRepo;

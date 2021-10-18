const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.sessions;
const newSessionsRepo = {
  ...baseRepository(collection),
};

module.exports = newSessionsRepo;

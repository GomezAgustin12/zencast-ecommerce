const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.users;
const newUserRepo = {
  ...baseRepository(collection),
};

module.exports = newUserRepo;

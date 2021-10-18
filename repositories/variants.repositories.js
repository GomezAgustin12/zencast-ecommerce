const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.variants;

const newVariantsRepo = {
  ...baseRepository(collection),
  deleteMany: async () =>
    await collection.deleteMany({ product: getId(req.body.productId) }, {}),
};

module.exports = newVariantsRepo;

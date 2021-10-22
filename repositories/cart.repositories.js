const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");
const db = getDb();
const collection = db.cart;

const newCartRepo = {
  ...baseRepository(collection),
  stockHeld: async (id) =>
    await collection
      .aggregate([
        { $match: { sessionId: { $ne: id } } },
        { $project: { _id: 0 } },
        { $project: { o: { $objectToArray: "$cart" } } },
        { $unwind: "$o" },
        {
          $group: {
            _id: {
              $ifNull: ["$o.v.variantId", "$o.v.productId"],
            },
            sumHeld: { $sum: "$o.v.quantity" },
          },
        },
      ])
      .toArray(),
  stockHeldCtrl: async () =>
    await collection
      .aggregate([
        { $project: { _id: 0 } },
        { $project: { o: { $objectToArray: "$cart" } } },
        { $unwind: "$o" },
        {
          $group: {
            _id: {
              $ifNull: ["$o.v.variantId", "$o.v.productId"],
            },
            sumHeld: { $sum: "$o.v.quantity" },
          },
        },
      ])
      .toArray(),
};

module.exports = newCartRepo;

const baseRepository = require("./baseRepository");
const { getDb } = require("../lib/db");

const db = getDb();
const collection = db.reviews;
const newReviewsRepo = {
  ...baseRepository(collection),
  reviewRating: async () =>
    await collection
      .aggregate([
        {
          $match: {
            product: ObjectId(product._id),
          },
        },
        {
          $group: {
            _id: "$item",
            avgRating: { $avg: "$rating" },
          },
        },
      ])
      .toArray(),
};

module.exports = newReviewsRepo;

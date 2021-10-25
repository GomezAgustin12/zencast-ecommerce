const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');
const ObjectId = require('mongodb').ObjectID;

const db = getDb();
const collection = db.reviews;
const newReviewsRepo = {
   ...baseRepository(collection),
   reviewRating: async (id) =>
      await collection
         .aggregate([
            {
               $match: {
                  product: ObjectId(id),
               },
            },
            {
               $group: {
                  _id: '$item',
                  avgRating: { $avg: '$rating' },
               },
            },
         ])
         .toArray(),
};

module.exports = newReviewsRepo;

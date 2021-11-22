const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');
const filters = require('../config/filter.json');

const db = getDb();
const collection = db.products;
const productRepo = {
   ...baseRepository(collection),
   insertOne: async (doc) => await collection.insertOne(doc),
   getFilters: async (query, filterTerms = {}) => {
      if (!query) {
         query = {};
      }

      if (filterTerms) {
         query = { $and: [{ ...query }, { ...filterTerms }] };
      }
      const res = await collection.find(query).toArray();
      return filters.items.map((e) => {
         if (filterTerms[e.id]) {
            return {
               id: e.id,
               display: e.display,
               items: [filterTerms[e.id]],
            };
         }
         let items = [];
         res.forEach((product) => {
            if (
               product[e.id] &&
               product[e.id] !== '' &&
               !items.includes(product[e.id])
            ) {
               items = [...items, product[e.id]];
            }
         });
         return {
            id: e.id,
            display: e.display,
            items,
         };
      });
   },
};

module.exports = productRepo;

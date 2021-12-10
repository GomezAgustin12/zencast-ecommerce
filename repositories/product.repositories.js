const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');
const filters = require('../config/filter.json');
const { getConfig } = require('../lib/config');
const Decimal128 = require('mongodb').Decimal128;
const colors = require('colors');

const db = getDb();
const collection = db.products;

const objIncludesField = (obj = {}, field) => {
   if (Object.keys(obj).includes(field)) return true;
   return false;
};

const productRepo = {
   ...baseRepository(collection),
   insertOne: async (doc) =>
      await collection.insertOne({
         ...doc,
         productPrice: Decimal128.fromString(doc.productPrice),
      }),
   updateOne: async ({ query = {}, set = {}, options = {} }) => {
      try {
         return await collection.findOneAndUpdate(
            query,
            {
               $set: objIncludesField(set, 'productPrice')
                  ? {
                       ...set,
                       productPrice: Decimal128.fromString(set.productPrice),
                    }
                  : set,
            },
            { multi: false, returnOriginal: false, ...options }
         );
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
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
   /**
    * @param  {boolean} frontend // whether or not this is an front or admin call
    * @param  {integer} page // The page number
    * @param  {string} collection // The collection to search
    * @param  {object} query // The mongo query
    * @param  {object} sort // The mongo sort
    */
   paginate: async (frontend, page, query, sort, filter) => {
      const config = getConfig();
      let numberItems = 10;
      if (frontend) {
         numberItems = config.productsPerPage ? config.productsPerPage : 6;
      }

      let skip = 0;
      if (page > 1) {
         skip = (page - 1) * numberItems;
      }

      if (!query) {
         query = {};
      }

      if (!filter || Object.keys(filter).length === 0) {
         if (Object.keys(query).length !== 0) {
            query = { $and: [{ ...query }, { ...filter }] };
         } else {
            query = { ...filter };
         }
      }

      if (!sort || Object.keys(sort).length === 0) {
         sort = { productPrice: -1 };
      }

      const skipAndLimit = (arr, skip) => {
         if (!Array.isArray(arr)) throw Error('"arr" is not an array');
         return arr.slice(skip, skip + numberItems);
      };

      try {
         // Run our queries
         const result = await Promise.all([
            collection
               .aggregate([
                  { $match: query },
                  {
                     $lookup: {
                        from: 'variants',
                        localField: '_id',
                        foreignField: 'product',
                        as: 'variants',
                     },
                  },
                  {
                     $sort: { productPrice: -1 },
                  },
               ])
               // .sort(sort)
               // .skip(skip)
               // .limit(parseInt(numberItems))
               .toArray(),
            collection.countDocuments(query),
         ]);
         const sortField = Object.keys(sort)[0];
         const sortOrder = Object.values(sort)[0];
         let res = result[0];
         if (sortOrder === 1) {
            res = result[0].sort((a, b) => a[sortField] - b[sortField]);
         } else {
            res = result[0].sort((a, b) => b[sortField] - a[sortField]);
         }

         res = skipAndLimit(res, skip);
         const returnData = {
            data: res,
            totalItems: result[1],
         };
         return returnData;
      } catch (err) {
         console.log('🤪', err);
         throw new Error('Error retrieving paginated data');
      }
   },
};

module.exports = productRepo;

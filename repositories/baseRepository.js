const colors = require('colors');
const { getConfig } = require('../lib/config');
const { validateJson } = require('../lib/schema');

const baseRepository = (collection) => ({
   validateSchema: (schema, object) => {
      const schemaValidate = validateJson(schema, object);
      if (!schemaValidate.result) {
         console.log('schemaValidate errors', schemaValidate.errors);
         throw Error(
            `${schemaValidate.errors[0].dataPath} ${schemaValidate.errors[0].message}`
         );
      }
   },
   findOne: async (query) => {
      try {
         return await collection.findOne(query);
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   findMany: async ({
      query = {},
      projection = {},
      sort = {},
      limit = Number.MAX_SAFE_INTEGER,
   }) => {
      try {
         const res = await collection
            .find(query, projection)
            .sort(sort)
            .limit(limit)
            .toArray();
         return res;
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   create: async (values) => {
      try {
         return await collection.insertOne(values);
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   updateOne: async ({ query = {}, set = {}, options = {} }) => {
      try {
         return await collection.findOneAndUpdate(
            query,
            {
               $set: set,
            },
            { multi: false, returnOriginal: false, ...options }
         );
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   delete: async (id) => {
      try {
         return await collection.deleteOne({ _id: id });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   countDocuments: async (query) => {
      try {
         return await collection.countDocuments(query);
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         throw Error(error);
      }
   },
   /**
    * @param  {boolean} frontend // whether or not this is an front or admin call
    * @param  {req} req // express `req` object
    * @param  {integer} page // The page number
    * @param  {object} query // The mongo query
    * @param  {object} sort // The mongo sort
    */
   paginate: (frontend, req, page, query, sort) => {
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
      if (!sort) {
         sort = {};
      }

      // Run our queries
      return Promise.all([
         collection
            .find(query)
            .skip(skip)
            .limit(parseInt(numberItems))
            .sort(sort)
            .toArray(),
         collection.countDocuments(query),
      ])
         .then((result) => {
            const returnData = { data: result[0], totalItems: result[1] };
            return returnData;
         })
         .catch((err) => {
            throw new Error('Error retrieving paginated data');
         });
   },
});

module.exports = baseRepository;

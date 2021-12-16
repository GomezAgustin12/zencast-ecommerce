const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');
const filters = require('../config/filter.json');
const { getConfig } = require('../lib/config');
const Decimal128 = require('mongodb').Decimal128;
const colors = require('colors');
const { glob } = require('glob');
const {
   getId,
   allowedMimeType,
   fileSizeLimit,
   checkDirectorySync,
} = require('../lib/common');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const util = require('util');
const mime = require('mime-type/with-db');

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

      const cutPageData = (skip) => (arr) => {
         if (!Array.isArray(arr)) throw Error('"arr" is not an array');
         return arr.slice(skip, skip + numberItems);
      };

      const sortArray =
         (sortField, sortOrder = 1) =>
         (data) => {
            if (!Array.isArray(data)) throw Error('"data" is not an Array');
            if (sortOrder === 1) {
               return data.sort((a, b) => a[sortField] - b[sortField]);
            }
            return data.sort((a, b) => b[sortField] - a[sortField]);
         };

      const addItemsAmount = (totalItems) => (data) => ({
         data,
         totalItems,
      });

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
               .toArray(),
            collection.countDocuments(query),
         ]);
         const sortField = Object.keys(sort)[0];
         const sortOrder = Object.values(sort)[0];

         const returnData = result[0].pipe(
            sortArray(sortField, sortOrder),
            cutPageData(skip),
            addItemsAmount(result[1])
         );

         return returnData;
      } catch (err) {
         console.log('🤪', err);
         throw new Error('Error retrieving paginated data');
      }
   },
   getFiles: async (id, folder) => {
      const product = await collection.findOne({ _id: getId(id) });
      if (!product) {
         return [];
      }

      // loop files in /public/uploads/
      const files = await glob.sync(
         `public/uploads/${folder}/${product._id.toString()}/**`,
         {
            nosort: true,
         }
      );

      // sort array
      files.sort();

      // declare the array of objects
      const fileList = [];

      // loop these files
      for (let i = 0; i < files.length; i++) {
         // only want files
         if (fs.lstatSync(files[i]).isDirectory() === false) {
            // declare the file object and set its values
            const file = {
               id: i,
               path: files[i].substring(6),
            };
            if (product.productImage === files[i].substring(6)) {
               file.productImage = true;
            }
            // push the file object into the array
            fileList.push(file);
         }
      }
      return fileList;
   },
   fileUpload: async (productId, file, fileType) => {
      if (!file) throw Error('Missing "file"');
      if (!fileType) throw Error('Missing "fileType"');

      // Get the mime type of the file
      const mimeType = mime.lookup(file.originalname);

      // Check for allowed mime type and file size
      if (!allowedMimeType.includes(mimeType) || file.size > fileSizeLimit) {
         // Remove temp file
         fs.unlinkSync(file.path);

         // Return error
         throw Error('File type not allowed or too large. Please try again.');
      }

      // get the product form the DB
      const product = await collection.findOne({ _id: getId(productId) });
      if (!product) {
         // delete the temp file.
         fs.unlinkSync(file.path);

         // Return error
         throw Error('File upload error. Please try again.');
      }

      const productPath = product._id.toString();
      const uploadDir = path.join(`public/uploads/${fileType}`, productPath);

      // Check directory and create (if needed)
      checkDirectorySync(uploadDir);

      // Setup the new path
      const filePath = path.join(
         '/uploads',
         fileType,
         productPath,
         file.originalname.replace(/ /g, '_')
      );

      // save the new file
      const dest = fs.createWriteStream(
         path.join(uploadDir, file.originalname.replace(/ /g, '_'))
      );
      const pipeline = util.promisify(stream.pipeline);

      await pipeline(fs.createReadStream(file.path), dest);

      // delete the temp file.
      fs.unlinkSync(file.path);

      return { filePath, product };
   },
   /**
    *
    * @param {string} product_id
    * @param {string} filePath
    * @param {string} field Product field to update
    */
   deleteFile: async (product_id, filePath) => {
      if (!filePath) return;

      // get the product from the db
      const product = await collection.findOne({
         _id: getId(product_id),
      });
      if (!product) throw Error('Product not found');

      // remove the image from disk
      fs.unlink(path.join('public', filePath), (err) => {
         if (err) {
            throw Error('Image not removed, please try again.');
         }
      });

      return { filePath, product };
   },
};

module.exports = productRepo;

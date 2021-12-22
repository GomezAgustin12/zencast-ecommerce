const colors = require('colors');
const bcrypt = require('bcryptjs');
const {
   mongoSanitize,
   getId,
   safeParseInt,
   cleanHtml,
   convertBool,
   checkboxBool,
} = require('../lib/common');
const { UserRepo, VariantsRepo, ProductRepo } = require('../repositories');
const { indexProducts } = require('../lib/indexing');
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');

const adminCtrl = {
   login: async (req, res) => {
      const user = await UserRepo.findOne({
         userEmail: mongoSanitize(req.body.email),
      });
      if (!user || user === null) {
         res.status(400).json({
            message: 'A user with that email does not exist.',
         });
         return;
      }

      // we have a user under that email so we compare the password
      bcrypt.compare(req.body.password, user.userPassword).then((result) => {
         if (result) {
            req.session.user = req.body.email;
            req.session.usersName = user.usersName;
            req.session.userId = user._id.toString();
            req.session.isAdmin = user.isAdmin;
            res.status(200).json({ message: 'Login successful' });
            return;
         }
         // password is not correct
         res.status(400).json({
            message: 'Access denied. Check password and try again.',
         });
      });
   },
   setup: async (req, res) => {
      const doc = {
         usersName: req.body.usersName,
         userEmail: req.body.userEmail,
         userPassword: bcrypt.hashSync(req.body.userPassword, 10),
         isAdmin: true,
         isOwner: true,
      };

      // check for users
      const userCount = await UserRepo.countDocuments({});
      if (userCount === 0) {
         // email is ok to be used.
         try {
            await UserRepo.create(doc);
            res.status(200).json({ message: 'User account inserted' });
            return;
         } catch (ex) {
            console.error(colors.red(`Failed to insert user: ${ex}`));
            res.status(200).json({ message: 'Setup failed' });
            return;
         }
      }
      res.status(200).json({ message: 'Already setup.' });
   },

   //-----------------------------PRODUCTS----------------

   create: async (req, res) => {
      try {
         const doc = {
            productPermalink: req.body.productPermalink,
            productTitle: cleanHtml(req.body.productTitle),
            productPrice: req.body.productPrice,
            productPriceEuro: req.body.productPriceEuro,
            productDescription: cleanHtml(req.body.productDescription),
            productGtin: cleanHtml(req.body.productGtin),
            productBrand: cleanHtml(req.body.productBrand),
            productPublished: convertBool(req.body.productPublished),
            productTags: req.body.productTags,
            productComment: checkboxBool(req.body.productComment),
            productAddedDate: new Date(),
            productStock: safeParseInt(req.body.productStock) || null,
            productStockDisable: convertBool(req.body.productStockDisable),
            productHashrate: cleanHtml(req.body.productHashrate),
            productCondition: cleanHtml(req.body.productCondition),
            productAlgorithm: cleanHtml(req.body.productAlgorithm),
            productWeight: safeParseInt(req.body.productWeight),
            productElectricityUsage: safeParseInt(
               req.body.productElectricityUsage
            ),
         };

         // Validate the body against schema
         await ProductRepo.validateSchema('newProduct', doc);

         // Check permalink doesn't already exist
         const product = await ProductRepo.countDocuments({
            productPermalink: req.body.productPermalink,
         });
         if (product > 0 && req.body.productPermalink !== '') {
            res.status(400).json({
               message: 'Permalink already exists. Pick a new one.',
            });
            return;
         }

         const newDoc = await ProductRepo.insertOne(doc);
         // get the new ID
         const newId = newDoc.insertedId;

         // add to lunr index
         indexProducts(req.app).then(() => {
            res.status(200).json({
               message: 'New product successfully created',
               productId: newId,
            });
         });
      } catch (error) {
         console.error(
            '🔥🔥',
            colors.red(`Error inserting document: ${error}`)
         );
         res.status(400).json({
            message: `Error inserting document: ${error.message}`,
         });
      }
   },
   updateProduct: async (req, res) => {
      const product = await ProductRepo.findOne({
         _id: getId(req.body.productId),
      });

      if (!product) {
         res.status(400).json({ message: 'Failed to update product' });
         return;
      }
      const count = await ProductRepo.countDocuments({
         productPermalink: req.body.productPermalink,
         _id: { $ne: getId(product._id) },
      });
      if (count > 0 && req.body.productPermalink !== '') {
         res.status(400).json({
            message: 'Permalink already exists. Pick a new one.',
         });
         return;
      }

      const images = await ProductRepo.getFiles(
         req.body.productId,
         'productImages'
      );
      const productDoc = {
         productId: req.body.productId,
         productPermalink: req.body.productPermalink,
         productTitle: cleanHtml(req.body.productTitle),
         productPrice: req.body.productPrice,
         productDescription: cleanHtml(req.body.productDescription),
         productGtin: cleanHtml(req.body.productGtin),
         productBrand: cleanHtml(req.body.productBrand),
         productPublished: convertBool(req.body.productPublished),
         productTags: req.body.productTags,
         productComment: checkboxBool(req.body.productComment),
         productStock: safeParseInt(req.body.productStock) || null,
         productStockDisable: convertBool(req.body.productStockDisable),
         productCondition: cleanHtml(req.body.productCondition),
         productAlgorithm: cleanHtml(req.body.productAlgorithm),
         productWeight: safeParseInt(req.body.productWeight),
         productElectricityUsage: safeParseInt(
            req.body.productElectricityUsage
         ),
         productHashrate: cleanHtml(req.body.productHashrate),
      };

      ProductRepo.validateSchema('editProduct', productDoc);

      // Remove productId from doc
      delete productDoc.productId;

      // if no featured image
      if (!product.productImage) {
         if (images.length > 0) {
            productDoc.productImage = images[0].path;
         } else {
            productDoc.productImage = '/uploads/placeholder.png';
         }
      } else {
         productDoc.productImage = product.productImage;
      }

      try {
         await ProductRepo.updateOne({
            query: { _id: getId(req.body.productId) },
            set: productDoc,
         });
         // Update the index
         indexProducts(req.app).then(() => {
            res.status(200).json({
               message: 'Successfully saved',
               product: productDoc,
            });
         });
      } catch (ex) {
         res.status(400).json({
            message: 'Failed to save. Please try again',
         });
      }
   },
   addVariant: async (req, res) => {
      try {
         const variantDoc = {
            product: req.body.product,
            title: req.body.title,
            price: req.body.price,
            stock: safeParseInt(req.body.stock) || null,
         };

         // Validate the body against schema
         ProductRepo.validateSchema('newVariant', variantDoc);

         // Check product exists
         const product = await ProductRepo.findOne({
            _id: getId(req.body.product),
         });

         if (!product) throw Error('Failed to add product variant');

         // Fix values
         variantDoc.product = getId(req.body.product);
         variantDoc.added = new Date();

         const variant = await VariantsRepo.create(variantDoc);
         product.variants = variant.ops;
         res.status(200).json({
            message: 'Successfully added variant',
            product,
         });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         res.status(400).json({ message: error.message });
      }
   },
   editVariant: async (req, res) => {
      const variantDoc = {
         product: req.body.product,
         variant: req.body.variant,
         title: req.body.title,
         price: req.body.price,
         stock: safeParseInt(req.body.stock) || null,
      };

      // Validate the body again schema
      ProductRepo.validateSchema('editVariant', variantDoc);

      // Validate ID's
      const product = await ProductRepo.findOne({
         _id: getId(req.body.product),
      });
      if (!product) {
         res.status(400).json({ message: 'Failed to add product variant' });
         return;
      }

      const variant = await VariantsRepo.findOne({
         _id: getId(req.body.variant),
      });
      if (!variant) {
         res.status(400).json({ message: 'Failed to add product variant' });
         return;
      }

      // Removed props not needed
      delete variantDoc.product;
      delete variantDoc.variant;

      try {
         const updatedVariant = await VariantsRepo.updateOne({
            query: { _id: getId(req.body.variant) },
            set: variantDoc,
         });

         res.status(200).json({
            message: 'Successfully saved variant',
            variant: updatedVariant.value,
         });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         res.status(400).json({
            message: 'Failed to save variant. Please try again',
         });
      }
   },
   removeVariant: async (req, res) => {
      const variant = await VariantsRepo.findOne({
         _id: getId(req.body.variant),
      });
      if (!variant) {
         res.status(400).json({
            message: 'Failed to remove product variant',
         });
         return;
      }

      try {
         // Delete the variant
         await VariantsRepo.delete(variant._id);
         res.status(200).json({ message: 'Successfully removed variant' });
      } catch (ex) {
         res.status(400).json({
            message: 'Failed to remove variant. Please try again',
         });
      }
   },

   deleteProduct: async (req, res) => {
      // remove the product
      await ProductRepo.delete(getId(req.body.productId));

      // Remove the variants
      await VariantsRepo.deleteMany({ product: getId(req.body.productId) });

      // delete any images and folder
      rimraf(`public/uploads/${req.body.productId}`, (err) => {
         if (err) {
            console.info(err.stack);
            res.status(400).json({ message: 'Failed to delete product' });
         }

         // re-index products
         indexProducts(req.app).then(() => {
            res.status(200).json({
               message: 'Product successfully deleted',
            });
         });
      });
   },
   publishState: async (req, res) => {
      try {
         await ProductRepo.updateOne({
            query: { _id: getId(req.body.id) },
            set: { productPublished: convertBool(req.body.state) },
         });
         res.status(200).json({ message: 'Published state updated' });
      } catch (ex) {
         console.error(
            colors.red(`Failed to update the published state: ${ex}`)
         );
         res.status(400).json({ message: 'Published state not updated' });
      }
   },
   setasmainimage: async (req, res) => {
      try {
         // update the productImage to the db
         await ProductRepo.updateOne({
            query: { _id: getId(req.body.product_id) },
            set: { productImage: req.body.productImage },
         });
         res.status(200).json({ message: 'Main image successfully set' });
      } catch (ex) {
         res.status(400).json({
            message: 'Unable to set as main image. Please try again.',
         });
      }
   },
   deleteImage: async (req, res) => {
      try {
         const { filePath, product } = await ProductRepo.deleteFile(
            req.body.product_id,
            req.body.productImage
         );

         if (filePath === product.productImage) {
            // set the productImage to null
            await ProductRepo.updateOne({
               query: { _id: getId(req.body.product_id) },
               set: { productImage: null },
            });
         }

         res.status(200).json({
            message: 'Image successfully deleted',
         });
      } catch (error) {
         res.status(400).json({ message: error.message });
      }
   },
   deleteTechFeatures: async (req, res) => {
      try {
         await ProductRepo.deleteFile(
            req.body.product_id,
            req.body.productTechFeature
         );

         // set the productImage to null
         await ProductRepo.updateOne({
            query: { _id: getId(req.body.product_id) },
            set: { techFeatures: null },
         });

         res.status(200).json({
            message: 'Image successfully deleted',
         });
      } catch (error) {
         res.status(400).json({ message: error.message });
      }
   },
   updateTechFeatures: async (req, res) => {
      try {
         const productId = req.body.productId;

         // get the product from the db
         const product = await ProductRepo.findOne({
            _id: getId(productId),
         });
         if (!product) throw Error('Product not found');

         if (product.techFeatures) {
            // remove the image from disk
            fs.unlink(path.join('public', product.techFeatures), (err) => {
               console.warn(err);
            });
         }

         const { filePath } = await ProductRepo.fileUpload(
            req.body.productId,
            req.file,
            req.body.type
         );

         // set techFeatures to the new path
         await ProductRepo.updateOne({
            query: { _id: getId(productId) },
            set: { techFeatures: filePath },
         });

         res.status(200).json({ message: 'File succesfully Updated' });
      } catch (error) {
         res.status(400).json({ message: error.message });
      }
   },
};

module.exports = adminCtrl;

const express = require('express');
const router = express.Router();
const { restrict, checkAccess } = require('../../lib/auth');
const adminCtrl = require('../../controllers/admin.controller');
const adminViews = require('../../controllers/admin.views');

router.get('/filter/:search', restrict, adminViews.filter);

// insert form
router.get('/new', restrict, checkAccess, adminViews.newProduct);

// insert new product form action
router.post('/insert', restrict, checkAccess, adminCtrl.create);

// render the editor
router.get('/edit/:id', restrict, checkAccess, adminViews.editProduct);

// Add a variant to a product
router.post('/addvariant', restrict, checkAccess, adminCtrl.addVariant);

// Update an existing product variant
router.post('/editvariant', restrict, checkAccess, adminCtrl.editVariant);

// Remove a product variant
router.post('/removevariant', restrict, checkAccess, adminCtrl.removeVariant);

// Update an existing product form action
router.post('/update', restrict, checkAccess, adminCtrl.updateProduct);

// delete a product
router.post('/delete', restrict, checkAccess, adminCtrl.deleteProduct);

// update the published state based on an ajax call from the frontend
router.post('/publishedState', restrict, checkAccess, adminCtrl.publishState);

// set as main product image
router.post('/setasmainimage', restrict, checkAccess, adminCtrl.setasmainimage);

// deletes a product image
router.post('/deleteimage', restrict, checkAccess, adminCtrl.deleteImage);

router.post(
   '/deleteTechFeatures',
   restrict,
   checkAccess,
   adminCtrl.deleteTechFeatures
);

router.get('/:page?', restrict, adminViews.page);

module.exports = router;

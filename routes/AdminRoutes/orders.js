const express = require('express');
const router = express.Router();
const { restrict, checkAccess } = require('../../lib/auth');
const orderCtrl = require('../../controllers/order.controller');
const orderViews = require('../../controllers/order.views');

// Admin section
router.get('/bystatus/:orderstatus', restrict, orderViews.adminSection);

// render the editor
router.get('/view/:id', restrict, orderViews.editor);

// render the editor
router.get('/create', restrict, orderViews.create);

router.post('/create', orderCtrl.create);

// Admin section
router.get('/filter/:search', restrict, orderViews.filter);

// order product
router.get('/delete/:id', restrict, orderCtrl.delete);

// update order status
router.post('/statusupdate', restrict, checkAccess, orderCtrl.updateStatus);

router.post(
   '/trackingnumber',
   restrict,
   checkAccess,
   orderCtrl.setTrackingNumber
);

// Show orders
router.get('/', restrict, orderViews.show);
router.get('/page/:page?', restrict, orderViews.show);

module.exports = router;

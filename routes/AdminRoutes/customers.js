const express = require('express');
const router = express.Router();
const { restrict } = require('../../lib/auth');
const customerCtrl = require('../../controllers/customer.controller');
const customerViews = require('../../controllers/customer.views');

// Update a customer
router.put('/update', restrict, customerCtrl.updateFromAdmin);

// Delete a customer
router.delete('/', restrict, customerCtrl.delete);

// render the customer view
router.get('/view/:id?', restrict, customerViews.viewFromAdmin);

// customers list
router.get('/', restrict, customerViews.listCustomers);

// Filtered customers list
router.get('/filter/:search', restrict, customerViews.search);

router.post('/lookup', restrict, customerCtrl.findByEmail);

module.exports = router;

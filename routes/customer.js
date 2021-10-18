const express = require('express');
const router = express.Router();
const { clearCustomer } = require('../lib/common');
const rateLimit = require('express-rate-limit');
const { checkCustomerPresent } = require('../lib/auth');
const customerCtrl = require('../controllers/customer.controller');
const customerViews = require('../controllers/customer.views');

const apiLimiter = rateLimit({
	windowMs: 300000, // 5 minutes
	max: 5,
});

// insert a customer
router.post('/customer/create', customerCtrl.create);

router.post('/customer/save', customerCtrl.save);

// Get customer orders
router.get('/customer/account', customerViews.account);

// Update a customer
router.put(
	'/customer/update',
	// checkCustomerPresent,
	customerCtrl.update
);

router.get('/customer/login', customerViews.login);

// login the customer and check the password
router.post('/customer/login_action', customerCtrl.login);

// customer forgotten password
router.get('/customer/forgotten', customerViews.forgotten);

// forgotten password
router.post('/customer/forgotten_action', apiLimiter, customerCtrl.forgottenPassword);

// reset password form
router.get('/customer/reset/:token', customerViews.resetPassword);

// reset password action
router.post('/customer/reset/:token', customerCtrl.resetPassword);

// logout the customer
router.post('/customer/check', customerCtrl.checkIfCustomerIslogout);

// logout the customer
router.post('/customer/logout', (req, res) => {
	// Clear our session
	clearCustomer(req);
	res.status(200).json({});
});

// logout the customer
router.get('/customer/logout', (req, res) => {
	// Clear our session
	clearCustomer(req);
	res.redirect('/customer/login');
});

module.exports = router;

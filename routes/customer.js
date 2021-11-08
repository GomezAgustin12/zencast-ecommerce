const express = require('express');
const router = express.Router();
const { clearCustomer } = require('../lib/common');
const rateLimit = require('express-rate-limit');
const { checkCustomerPresent } = require('../lib/auth');
const customerService = require('../controllers/customer.service');
const customerViews = require('../controllers/customer.views');
const apiLimiter = rateLimit({
   windowMs: 300000, // 5 minutes
   max: 5,
});
const colors = require('colors');

// Get customer orders
router.get('/customer/account', customerViews.account);
router.get('/customer/login', customerViews.login);
// Customer signup
router.get('/customer/signUp', customerViews.signUp);
// customer forgotten password
router.get('/customer/forgotten', customerViews.forgotten);

// insert a customer
router.post('/customer/create', async (req, res) => {
   try {
      const response = await customerService.create(req);
      res.status(200).json(response);
   } catch (error) {
      console.error(colors.red('🔥🔥', 'Failed to insert customer: ', error));
      res.status(400).json({
         message: `Failed to insert customer: ${error.message}`,
      });
   }
});

router.post('/customer/save', async (req, res) => {
   try {
      const response = await customerService.save(req, res);
      res.status(200).json(response);
   } catch (error) {
      console.error(colors.red(error));
      res.status(400).json({ message: error.message });
   }
});

// Update a customer
router.put('/customer/update', checkCustomerPresent, customerService.update);

// login the customer and check the password
router.post('/customer/login_action', customerService.login);

// forgotten password
router.post(
   '/customer/forgotten_action',
   apiLimiter,
   customerService.forgottenPassword
);

// reset password form
router.get('/customer/reset/:token', customerViews.resetPassword);

// reset password action
router.post('/customer/reset/:token', customerService.resetPassword);

// logout the customer
router.post('/customer/check', customerService.checkIfCustomerIslogout);

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

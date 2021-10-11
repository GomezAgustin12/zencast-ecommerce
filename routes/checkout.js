const express = require('express');
const router = express.Router();
const moment = require('moment');
const _ = require('lodash');
const { clearSessionValue, getCountryList } = require('../lib/common');
const { getPaymentConfig } = require('../lib/config');
const { updateTotalCart } = require('../lib/cart');
const checoutCtrl = require('../controllers/checkout.controller');
const checoutViews = require('../controllers/checkout.views');
const countryList = getCountryList();

router.get('/checkout/information', checoutViews.information);

router.get('/checkout/shipping', checoutViews.shipping);

router.get('/checkout/cart', checoutViews.cart);

router.get('/checkout/cartdata', checoutCtrl.cartdata);

router.get('/checkout/payment', checoutViews.payment);

router.post('/checkout/adddiscountcode', checoutCtrl.adddiscountcode);

router.post('/checkout/removediscountcode', checoutCtrl.removediscountcode);

module.exports = router;

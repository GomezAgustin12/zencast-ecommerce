const express = require('express');
const router = express.Router();
const checoutCtrl = require('../controllers/checkout.controller');
const checoutViews = require('../controllers/checkout.views');

router.get('/checkout/information', checoutViews.information);

router.get('/checkout/shipping', checoutViews.shipping);

router.get('/checkout/cart', checoutViews.cart);

router.get('/checkout/cartdata', checoutCtrl.cartdata);

router.get('/checkout/payment', checoutViews.payment);

router.post('/checkout/adddiscountcode', checoutCtrl.adddiscountcode);

router.post('/checkout/removediscountcode', checoutCtrl.removediscountcode);

module.exports = router;

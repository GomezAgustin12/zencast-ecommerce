const express = require('express');
const productViews = require('../controllers/product.views');
const productCtrl = require('../controllers/product.controller');
const router = express.Router();
const { emptyCart } = require('../lib/cart');

// show an individual product
router.get('/product/:id', productViews.product);

// Updates a single product quantity
router.post('/product/updatecart', productCtrl.updatecart);

// Remove single product from cart
router.post('/product/removefromcart', productCtrl.removefromcart);

// Totally empty the cart
router.post('/product/emptycart', async (req, res) => {
   emptyCart(req, res, 'json');
});

// Add item to cart
router.post('/product/addtocart', productCtrl.addtocart);

// Totally empty the cart
router.post('/product/addreview', productCtrl.addreview);

module.exports = router;

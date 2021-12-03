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

//Filter Products
router.get('/product/page/:pageNum', productViews.show);
router.get('/product/page/:pageNum/sortOrder/:sortOrder', productViews.show);
router.get(
   '/product/page/:pageNum/sortOrder/:sortOrder/filterTerms/:filterTerms',
   productViews.show
);
router.get(
   '/product/page/:pageNum/filterTerms/:filterTerms',
   productViews.show
);
router.get('/product/filterTerms/:filterTerms', productViews.show);
router.get('/product/searchTerm/:searchTerm', productViews.show);
router.get('/product/sortOrder/:sortOrder', productViews.show);
router.get(
   '/product/searchTerm/:searchTerm/filterTerms/:filterTerms',
   productViews.show
);
router.get(
   '/product/sortOrder/:sortOrder/filterTerms/:filterTerms',
   productViews.show
);

module.exports = router;

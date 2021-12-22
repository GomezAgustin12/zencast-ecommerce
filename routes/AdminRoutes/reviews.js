const express = require('express');
const router = express.Router();
const { restrict, checkAccess } = require('../../lib/auth');
const reviewsCtrl = require('../../controllers/reviews.controller');
const reviewsViews = require('../../controllers/reviews.views');

router.get('/', restrict, reviewsViews.page);
router.get('/page/:page?', restrict, reviewsViews.page);

router.get('/filter/:search', restrict, reviewsViews.filter);

// Remove a product review
router.post('/delete', restrict, checkAccess, reviewsCtrl.delete);

module.exports = router;

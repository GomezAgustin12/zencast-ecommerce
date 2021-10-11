const express = require('express');
const reviewsCtrl = require('../controllers/reviews.controller');
const reviewsViews = require('../controllers/reviews.views');
const { restrict, checkAccess } = require('../lib/auth');
const router = express.Router();



module.exports = router;

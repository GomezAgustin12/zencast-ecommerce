const express = require('express');
const { restrict, checkAccess } = require('../lib/auth');
const orderCtrl = require('../controllers/order.controller');
const orderViews = require('../controllers/order.views');
const router = express.Router();

module.exports = router;

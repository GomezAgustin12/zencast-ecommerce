const express = require('express');
const { restrict } = require('../lib/auth');
const userViews = require('../controllers/user.views');
const userCtrl = require('../controllers/user.controller');
const router = express.Router();

module.exports = router;

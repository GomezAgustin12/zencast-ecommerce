const express = require('express');
const router = express.Router();
const { restrict } = require('../../lib/auth');
const userViews = require('../../controllers/user.views');
const userCtrl = require('../../controllers/user.controller');

router.get('/', restrict, userViews.list);

// edit user
router.get('/user/edit/:id', restrict, userViews.editUser);

// users new
router.get('/user/new', restrict, userViews.newUser);

// delete a user
router.post('/user/delete', restrict, userCtrl.delete);

// update a user
router.post('/user/update', restrict, userCtrl.update);

// insert a user
router.post('/user/insert', restrict, userCtrl.create);

module.exports = router;

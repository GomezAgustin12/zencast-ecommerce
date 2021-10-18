const express = require("express");
const router = express.Router();
const { restrict } = require("../../lib/auth");
const userViews = require("../../controllers/user.views");
const userCtrl = require("../../controllers/user.controller");

router.get("/", restrict, userViews.list);

// edit user
router.get("/edit/:id", restrict, userViews.editUser);

// users new
router.get("/new", restrict, userViews.newUser);

// delete a user
router.post("/delete", restrict, userCtrl.delete);

// update a user
router.post("/update", restrict, userCtrl.update);

// insert a user
router.post("/insert", restrict, userCtrl.create);

module.exports = router;

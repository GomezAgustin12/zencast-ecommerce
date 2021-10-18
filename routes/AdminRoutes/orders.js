const express = require("express");
const router = express.Router();
const { restrict, checkAccess } = require("../../lib/auth");
const orderCtrl = require("../../controllers/order.controller");
const orderViews = require("../../controllers/order.views");

// Show orders
router.get("/:page?", restrict, orderViews.show);

// Admin section
router.get("/bystatus/:orderstatus", restrict, orderViews.adminSection);

// render the editor
router.get("/view/:id", restrict, orderViews.editor);

// render the editor
router.get("/create", restrict, orderViews.create);

router.post("/create", orderCtrl.create);

// Admin section
router.get("/filter/:search", restrict, orderViews.filter);

// order product
router.delete("/delete/:id", restrict, orderCtrl.delete);

// update order status
router.post("/statusupdate", restrict, checkAccess, orderCtrl.updateStatus);

module.exports = router;

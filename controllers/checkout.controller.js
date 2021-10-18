const moment = require("moment");
const _ = require("lodash");
const { updateTotalCart } = require("../lib/cart");
const discountsRepo = require("../repositories/discounts.repositories");

const checoutCtrl = {
  adddiscountcode: async (req, res) => {
    const config = req.app.config;

    // if there is no items in the cart return a failure
    if (!req.session.cart) {
      res.status(400).json({
        message: "The are no items in your cart.",
      });
      return;
    }

    // Check if the discount module is loaded
    if (!config.modules.loaded.discount) {
      res.status(400).json({
        message: "Access denied.",
      });
      return;
    }

    // Check defined or null
    if (!req.body.discountCode || req.body.discountCode === "") {
      res.status(400).json({
        message: "Discount code is invalid or expired",
      });
      return;
    }

    // Validate discount code
    const discount = await discountsRepo.findOne({
      code: req.body.discountCode,
    });
    if (!discount) {
      res.status(400).json({
        message: "Discount code is invalid or expired",
      });
      return;
    }

    // Validate date validity
    if (!moment().isBetween(moment(discount.start), moment(discount.end))) {
      res.status(400).json({
        message: "Discount is expired",
      });
      return;
    }

    // Set the discount code
    req.session.discountCode = discount.code;

    // Update the cart amount
    await updateTotalCart(req, res);

    // Return the message
    res.status(200).json({
      message: "Discount code applied",
    });
  },
  removediscountcode: async (req, res) => {
    // if there is no items in the cart return a failure
    if (!req.session.cart) {
      res.status(400).json({
        message: "The are no items in your cart.",
      });
      return;
    }

    // Delete the discount code
    delete req.session.discountCode;

    // update total cart amount
    await updateTotalCart(req, res);

    // Return the message
    res.status(200).json({
      message: "Discount code removed",
    });
  },
  cartdata: (req, res) => {
    const config = req.app.config;

    res.status(200).json({
      cart: req.session.cart,
      session: req.session,
      currencySymbol: config.currencySymbol || "$",
    });
  },
};
module.exports = checoutCtrl;

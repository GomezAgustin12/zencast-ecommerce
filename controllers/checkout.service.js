const moment = require('moment');
const { updateTotalCart } = require('../lib/cart');
const discountsRepo = require('../repositories/discounts.repositories');

const checkoutService = {
   addDiscountCode: async (req) => {
      const config = req.app.config;

      // if there is no items in the cart return a failure
      if (!req.session.cart) {
         throw Error('The are no items in your cart.');
      }

      // Check if the discount module is loaded
      if (!config.modules.loaded.discount) {
         throw Error('Access denied.');
      }

      // Check defined or null
      if (!req.body.discountCode || req.body.discountCode === '') {
         throw Error('Discount code is invalid or expired');
      }

      // Validate discount code
      const discount = await discountsRepo.findOne({
         code: req.body.discountCode,
      });

      if (!discount) {
         throw Error('Discount code is invalid or expired');
      }

      // Validate date validity
      if (!moment().isBetween(moment(discount.start), moment(discount.end))) {
         throw Error('Discount is expired');
      }

      // Set the discount code
      req.session.discountCode = discount.code;

      // Update the cart amount
      await updateTotalCart(req);

      // Return the message
      return {
         message: 'Discount code applied',
      };
   },
   removeDiscountCode: async (req, res) => {
      // if there is no items in the cart return a failure
      if (!req.session.cart) {
         throw Error('The are no items in your cart.');
      }

      // Delete the discount code
      delete req.session.discountCode;

      // update total cart amount
      await updateTotalCart(req, res);

      // Return the message
      return { message: 'Discount code removed' };
   },
   cartData: (req) => {
      const config = req.app.config;

      return {
         cart: req.session.cart,
         session: req.session,
         currencySymbol: config.currencySymbol || '$',
      };
   },
};
module.exports = checkoutService;

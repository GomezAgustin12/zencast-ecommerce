const moment = require('moment');
const { updateTotalCart, emptyCart } = require('../lib/cart');
const { getId } = require('../lib/common');
const { indexOrders } = require('../lib/indexing');
const { OrdersRepo } = require('../repositories');
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
   confirmWireTransfer: (req, res) => {
      // new order doc
      const orderDoc = {
         orderPaymentId: null,
         orderPaymentGateway: 'Wire Transfer',
         orderTotal: req.session.totalCartAmount,
         orderShipping: req.session.totalCartShipping,
         orderItemCount: req.session.totalCartItems,
         orderProductCount: req.session.totalCartProducts,
         orderCustomer: getId(req.session.customerId),
         orderEmail: req.session.customerEmail,
         orderCompany: req.session.customerCompany,
         orderFirstname: req.session.customerFirstname,
         orderLastname: req.session.customerLastname,
         orderAddr1: req.session.customerAddress1,
         orderAddr2: req.session.customerAddress2,
         orderCountry: req.session.customerCountry,
         orderState: req.session.customerState,
         orderPostcode: req.session.customerPostcode,
         orderPhoneNumber: req.session.customerPhone,
         orderComment: req.session.orderComment,
         orderTrackingNumber: null,
         trackingCompany: null,
         trackingURL: null,
         orderStatus: 'Pending',
         orderDate: new Date(),
         orderProducts: req.session.cart,
         orderType: 'Single',
      };

      // insert order into DB
      OrdersRepo.create(orderDoc, (err, newDoc) => {
         if (err) {
            console.info(err.stack);
         }

         // get the new ID
         const newId = newDoc.insertedId;
         console.log(newId);

         // add to lunr index
         indexOrders(req.app).then(() => {
            // clear the cart
            if (req.session.cart) {
               emptyCart(req, res, 'function');
            }
         });
      });
   },
};
module.exports = checkoutService;

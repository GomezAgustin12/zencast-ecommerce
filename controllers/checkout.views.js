const { clearSessionValue, getCountryList, getId } = require('../lib/common');
const { getPaymentConfig } = require('../lib/config');
const { updateTotalCart } = require('../lib/cart');
const { CustomersRepo, WireAccount } = require('../repositories');
const countryList = getCountryList();

const checoutViews = {
   information: async (req, res, next) => {
      const config = req.app.config;

      // if there is no items in the cart then render a failure
      if (!req.session.cart) {
         req.session.message =
            'The are no items in your cart. Please add some items before checking out';
         req.session.messageType = 'danger';
         res.redirect('/');
         return;
      }

      const customer = await CustomersRepo.findOne({
         _id: getId(req.session.customerId),
      });

      let paymentType = '';
      if (req.session.cartSubscription) {
         paymentType = '_subscription';
      }

      // render the payment page
      res.render(`${config.themeViews}checkout-information`, {
         title: 'Checkout - Information',
         config: req.app.config,
         customer,
         session: req.session,
         paymentType,
         cartClose: false,
         page: 'checkout-information',
         countryList,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         showFooter: 'showFooter',
      });
   },
   shipping: async (req, res, next) => {
      const config = req.app.config;

      // if there is no items in the cart then render a failure
      if (!req.session.cart) {
         req.session.message =
            'The are no items in your cart. Please add some items before checking out';
         req.session.messageType = 'danger';
         res.redirect('/');
         return;
      }

      if (!req.session.customerEmail) {
         req.session.message =
            'Cannot proceed to shipping without customer information';
         req.session.messageType = 'danger';
         res.redirect('/checkout/information');
         return;
      }

      // Net cart amount
      const netCartAmount =
         req.session.totalCartAmount - req.session.totalCartShipping || 0;

      // Recalculate shipping
      config.modules.loaded.shipping.calculateShipping(
         netCartAmount,
         config,
         req
      );

      // render the payment page
      res.render(`${config.themeViews}checkout-shipping`, {
         title: 'Checkout - Shipping',
         config: req.app.config,
         session: req.session,
         cartClose: false,
         cartReadOnly: true,
         page: 'checkout-shipping',
         countryList,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         showFooter: 'showFooter',
      });
   },
   cart: (req, res) => {
      const config = req.app.config;

      res.render(`${config.themeViews}checkout-cart`, {
         title: 'Checkout - Cart',
         page: req.query.path,
         config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         showFooter: 'showFooter',
      });
   },
   payment: async (req, res) => {
      const config = req.app.config;

      // if there is no items in the cart then render a failure
      if (!req.session.cart) {
         req.session.message =
            'The are no items in your cart. Please add some items before checking out';
         req.session.messageType = 'danger';
         res.redirect('/');
         return;
      }

      let paymentType = '';
      if (req.session.cartSubscription) {
         paymentType = '_subscription';
      }

      const wireAccount = await WireAccount.findOne();

      // update total cart amount one last time before payment
      await updateTotalCart(req, res);

      res.render(`${config.themeViews}checkout-payment`, {
         title: 'Checkout - Payment',
         config: req.app.config,
         paymentConfig: getPaymentConfig(),
         session: req.session,
         paymentPage: true,
         paymentType,
         wireAccount: wireAccount.bankingAccountData,
         cartClose: true,
         cartReadOnly: true,
         page: 'checkout-information',
         countryList,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         showFooter: 'showFooter',
      });
   },
};

module.exports = checoutViews;

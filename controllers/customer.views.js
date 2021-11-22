const { getId, clearSessionValue, getCountryList } = require('../lib/common');
const { CustomersRepo, OrdersRepo } = require('../repositories');

const customerViews = {
   forgotten: (req, res) => {
      res.render('forgotten', {
         title: 'Forgotten',
         route: 'customer',
         forgotType: 'customer',
         config: req.app.config,
         helpers: req.handlebars.helpers,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         showFooter: 'showFooter',
      });
   },
   account: async (req, res) => {
      const config = req.app.config;

      if (!req.session.customerPresent) {
         res.redirect('/customer/login');
         return;
      }

      const orders = await OrdersRepo.findMany({
         query: {
            orderCustomer: getId(req.session.customerId),
         },
         sort: { orderDate: -1 },
      });

      const customer = await CustomersRepo.findOne({
         _id: getId(req.session.customerId),
      });

      res.render(`${config.themeViews}customer-account`, {
         title: 'Orders',
         customer,
         session: req.session,
         orders,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         countryList: getCountryList(),
         config: req.app.config,
         helpers: req.handlebars.helpers,
      });
   },
   viewFromAdmin: async (req, res) => {
      const customer = await CustomersRepo.findOne({
         _id: getId(req.params.id),
      });

      if (!customer) {
         // If API request, return json
         if (req.apiAuthenticated) {
            return res.status(400).json({ message: 'Customer not found' });
         }
         req.session.message = 'Customer not found';
         req.session.message_type = 'danger';
         return res.redirect('/admin/customer');
      }

      // If API request, return json
      if (req.apiAuthenticated) {
         return res.status(200).json(customer);
      }

      return res.render('customer', {
         title: 'View customer',
         result: customer,
         admin: true,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         countryList: getCountryList(),
         config: req.app.config,
         editor: true,
         helpers: req.handlebars.helpers,
      });
   },
   listCustomers: async (req, res) => {
      const customers = await CustomersRepo.findMany({
         sort: { created: -1 },
         limit: 20,
      });

      // If API request, return json
      if (req.apiAuthenticated) {
         return res.status(200).json(customers);
      }

      return res.render('customers', {
         title: 'Customers - List',
         admin: true,
         customers: customers,
         session: req.session,
         helpers: req.handlebars.helpers,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         config: req.app.config,
      });
   },
   search: async (req, res) => {
      const searchTerm = req.params.search;
      const customersIndex = req.app.customersIndex;

      const lunrIdArray = [];
      customersIndex.search(searchTerm).forEach((id) => {
         lunrIdArray.push(getId(id.ref));
      });

      // we search on the lunr indexes
      const customers = await CustomersRepo.findMany({
         query: { _id: { $in: lunrIdArray } },
         sort: { created: -1 },
      });

      // If API request, return json
      if (req.apiAuthenticated) {
         return res.status(200).json({
            customers,
         });
      }

      return res.render('customers', {
         title: 'Customer results',
         customers: customers,
         admin: true,
         config: req.app.config,
         session: req.session,
         searchTerm: searchTerm,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   login: async (req, res) => {
      const config = req.app.config;

      res.render(`${config.themeViews}customer-login`, {
         title: 'Customer login',
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   signUp: async (req, res) => {
      const config = req.app.config;

      res.render(`${config.themeViews}customer-signUp`, {
         title: 'Customer register',
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         countryList: getCountryList(),
      });
   },
   resetPassword: async (req, res) => {
      const db = req.app.db;

      // Find the customer using the token
      const customer = await db.customers.findOne({
         resetToken: req.params.token,
         resetTokenExpiry: { $gt: Date.now() },
      });
      if (!customer) {
         req.session.message = 'Password reset token is invalid or has expired';
         req.session.message_type = 'danger';
         res.redirect('/forgot');
         return;
      }

      // show the password reset form
      res.render('reset', {
         title: 'Reset password',
         token: req.params.token,
         route: 'customer',
         config: req.app.config,
         message: clearSessionValue(req.session, 'message'),
         message_type: clearSessionValue(req.session, 'message_type'),
         show_footer: 'show_footer',
         helpers: req.handlebars.helpers,
      });
   },
};

module.exports = customerViews;

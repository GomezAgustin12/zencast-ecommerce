const { getId, clearSessionValue, getCountryList } = require('../lib/common');
const OrderRepo = require('../repositories/orders.repositories');

const orderViews = {
   create: async (req, res) => {
      res.render('order-create', {
         title: 'Create order',
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         countryList: getCountryList(),
         editor: true,
         admin: true,
         helpers: req.handlebars.helpers,
      });
   },
   filter: async (req, res, next) => {
      const searchTerm = req.params.search;
      const ordersIndex = req.app.ordersIndex;

      const lunrIdArray = [];
      ordersIndex.search(searchTerm).forEach((id) => {
         lunrIdArray.push(getId(id.ref));
      });

      // we search on the lunr indexes
      const orders = await OrderRepo.findMany({
         query: { _id: { $in: lunrIdArray } },
      });
      // If API request, return json
      if (req.apiAuthenticated) {
         res.status(200).json({
            orders,
         });
         return;
      }

      res.render('orders', {
         title: 'Order results',
         orders: orders,
         admin: true,
         config: req.app.config,
         session: req.session,
         searchTerm: searchTerm,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   show: async (req, res, next) => {
      let pageNum = 1;
      if (req.params.page) {
         pageNum = req.params.page;
      }

      // Get our paginated data
      const orders = await OrderRepo.paginate(
         false,
         req,
         pageNum,
         {},
         { orderDate: -1 }
      );

      // If API request, return json
      if (req.apiAuthenticated) {
         res.status(200).json({
            orders,
         });
         return;
      }

      const transformMongoIdToString = orders.data.map((order) => ({
         ...order,
         _id: order._id.toString(),
      }));

      res.render('orders', {
         title: 'Cart',
         orders: transformMongoIdToString,
         totalItemCount: orders.totalItems,
         pageNum,
         paginateUrl: 'admin/order',
         admin: true,
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   adminSection: async (req, res, next) => {
      if (typeof req.params.orderstatus === 'undefined') {
         res.redirect('/admin/order');
         return;
      }

      // case insensitive search
      const regex = new RegExp(
         ['^', req.params.orderstatus, '$'].join(''),
         'i'
      );
      const orders = await OrderRepo.findMany({
         query: { orderStatus: regex },
         limit: 10,
         sort: { orderDate: -1 },
      });

      // If API request, return json
      if (req.apiAuthenticated) {
         res.status(200).json({
            orders,
         });
         return;
      }

      res.render('orders', {
         title: 'Cart',
         orders: orders,
         admin: true,
         filteredOrders: true,
         filteredStatus: req.params.orderstatus,
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   editor: async (req, res) => {
      const order = await OrderRepo.findOne({ _id: getId(req.params.id) });

      res.render('order', {
         title: 'View order',
         result: order,
         config: req.app.config,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         editor: true,
         admin: true,
         helpers: req.handlebars.helpers,
      });
   },
};

module.exports = orderViews;

const { clearSessionValue, getThemes, getId } = require('../lib/common');

const { getImages } = require('../lib/common');

const {
   UserRepo,
   ProductRepo,
   OrdersRepo,
   VariantsRepo,
} = require('../repositories');
const { paginateData } = require('../lib/paginate');

const adminViews = {
   logout: (req, res) => {
      req.session.user = null;
      req.session.message = null;
      req.session.messageType = null;
      res.redirect('/');
   },
   login: async (req, res) => {
      const userCount = await UserRepo.countDocuments({});
      // we check for a user. If one exists, redirect to login form otherwise setup
      if (userCount && userCount > 0) {
         // set needsSetup to false as a user exists
         req.session.needsSetup = false;
         res.render('login', {
            title: 'Login',
            referringUrl: req.header('Referer'),
            config: req.app.config,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
         });
      } else {
         // if there are no users set the "needsSetup" session
         req.session.needsSetup = true;
         res.redirect('/admin/setup');
      }
   },
   setup: async (req, res) => {
      const userCount = await UserRepo.countDocuments({});
      // dont allow the user to "re-setup" if a user exists.
      // set needsSetup to false as a user exists
      req.session.needsSetup = false;
      if (userCount === 0) {
         req.session.needsSetup = true;
         res.render('setup', {
            title: 'Setup',
            config: req.app.config,
            helpers: req.handlebars.helpers,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            showFooter: 'showFooter',
         });
         return;
      }
      res.redirect('/admin/login');
   },
   dashboard: async (req, res) => {
      // Collate data for dashboard
      const dashboardData = {
         productsCount: await ProductRepo.countDocuments({
            productPublished: true,
         }),
         ordersCount: await OrdersRepo.countDocuments({}),
         ordersAmount: await OrdersRepo.amount(),
         productsSold: await OrdersRepo.sold(),
         topProducts: await OrdersRepo.top(),
      };

      // Fix aggregate data
      if (dashboardData.ordersAmount.length > 0) {
         dashboardData.ordersAmount = dashboardData.ordersAmount[0].sum;
      }
      if (dashboardData.productsSold.length > 0) {
         dashboardData.productsSold = dashboardData.productsSold[0].sum;
      } else {
         dashboardData.productsSold = 0;
      }

      res.render('dashboard', {
         title: 'Cart dashboard',
         session: req.session,
         admin: true,
         dashboardData,
         themes: getThemes(),
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         config: req.app.config,
         csrfToken: req.csrfToken(),
      });
   },

   //------------------------PRODUCTS-----------------------

   page: async (req, res) => {
      let pageNum = 1;
      if (req.params.page) {
         pageNum = req.params.page;
      }

      // Get our paginated data
      const products = await paginateData(
         false,
         req,
         pageNum,
         'products',
         {},
         { productAddedDate: -1 }
      );

      res.render('products', {
         title: 'Cart - Products',
         results: products.data,
         totalItemCount: products.totalItems,
         pageNum,
         paginateUrl: 'admin/product',
         resultType: 'top',
         session: req.session,
         admin: true,
         config: req.app.config,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   filter: async (req, res, next) => {
      const searchTerm = req.params.search;
      const productsIndex = req.app.productsIndex;

      const lunrIdArray = [];
      productsIndex.search(searchTerm).forEach((id) => {
         lunrIdArray.push(getId(id.ref));
      });

      // we search on the lunr indexes
      const results = await ProductRepo.findMany({
         query: { _id: { $in: lunrIdArray } },
      });

      if (req.apiAuthenticated) {
         res.status(200).json(results);
         return;
      }

      res.render('products', {
         title: 'Results',
         results: results,
         resultType: 'filtered',
         admin: true,
         config: req.app.config,
         session: req.session,
         searchTerm: searchTerm,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
      });
   },
   newProduct: (req, res) => {
      res.render('product-new', {
         title: 'New product',
         session: req.session,
         productTitle: clearSessionValue(req.session, 'productTitle'),
         productDescription: clearSessionValue(
            req.session,
            'productDescription'
         ),
         productPrice: clearSessionValue(req.session, 'productPrice'),
         productPermalink: clearSessionValue(req.session, 'productPermalink'),
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         editor: true,
         admin: true,
         helpers: req.handlebars.helpers,
         config: req.app.config,
      });
   },
   editProduct: async (req, res) => {
      const images = await getImages(req.params.id, req, res);
      const product = await ProductRepo.findOne({
         _id: getId(req.params.id),
      });
      if (!product) {
         // If API request, return json
         if (req.apiAuthenticated) {
            res.status(400).json({ message: 'Product not found' });
            return;
         }
         req.session.message = 'Product not found';
         req.session.messageType = 'danger';
         res.redirect('/admin/product');
         return;
      }

      // Get variants
      product.variants = await VariantsRepo.findMany({
         query: { product: getId(req.params.id) },
      });

      // If API request, return json
      if (req.apiAuthenticated) {
         res.status(200).json(product);
         return;
      }

      res.render('product-edit', {
         title: 'Edit product',
         result: product,
         images: images,
         admin: true,
         session: req.session,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         config: req.app.config,
         editor: true,
         helpers: req.handlebars.helpers,
      });
   },
};

module.exports = adminViews;

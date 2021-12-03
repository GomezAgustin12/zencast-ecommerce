const express = require('express');
const router = express.Router();
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const {
   getId,
   hooker,
   clearSessionValue,
   addSitemapProducts,
   getCountryList,
} = require('../lib/common');
const { getSort } = require('../lib/paginate');
const { getPaymentConfig } = require('../lib/config');
const { emptyCart } = require('../lib/cart');
const { sortMenu, getMenu } = require('../lib/menu');
const {
   OrdersRepo,
   ProductRepo,
   VariantsRepo,
   CartRepo,
   PagesRepo,
} = require('../repositories');
const productRepo = require('../repositories/product.repositories');
const countryList = getCountryList();

// Google products
router.get('/googleproducts.xml', async (req, res, next) => {
   let productsFile = '';
   try {
      productsFile = fs.readFileSync(path.join('bin', 'googleproducts.xml'));
   } catch (ex) {
      console.log('Google products file not found');
   }
   res.type('text/plain');
   res.send(productsFile);
});

// These is the customer facing routes
router.get('/payment/:orderId', async (req, res, next) => {
   const db = req.app.db;
   const config = req.app.config;

   // Get the order
   const order = await OrdersRepo.findOne({ _id: getId(req.params.orderId) });
   if (!order) {
      res.render('error', {
         title: 'Not found',
         message: 'Order not found',
         helpers: req.handlebars.helpers,
         config,
      });
      return;
   }

   // If stock management is turned on payment approved update stock level
   if (config.trackStock && req.session.paymentApproved) {
      // Check to see if already updated to avoid duplicate updating of stock
      if (order.productStockUpdated !== true) {
         Object.keys(order.orderProducts).forEach(async (productKey) => {
            const product = order.orderProducts[productKey];
            const dbProduct = await ProductRepo.findOne({
               _id: getId(product.productId),
            });
            let productCurrentStock = dbProduct.productStock;

            // If variant, get the stock from the variant
            if (product.variantId) {
               const variant = await VariantsRepo.findOne({
                  _id: getId(product.variantId),
                  product: getId(product._id),
               });
               if (variant) {
                  productCurrentStock = variant.stock;
               } else {
                  productCurrentStock = 0;
               }
            }

            // Calc the new stock level
            let newStockLevel = productCurrentStock - product.quantity;
            if (newStockLevel < 1) {
               newStockLevel = 0;
            }

            // Update stock
            if (product.variantId) {
               // Update variant stock
               await VariantsRepo.updateOne({
                  query: { _id: getId(product.variantId) },
                  set: { stock: newStockLevel },
               });
            } else {
               // Update product stock
               await ProductRepo.updateOne({
                  query: { _id: getId(product.productId) },
                  set: { productStock: newStockLevel },
               });
            }

            // Add stock updated flag to order
            await OrdersRepo.updateOne({
               query: { _id: getId(order._id) },
               set: { productStockUpdated: true },
            });
         });
         console.info('Updated stock levels');
      }
   }

   // If hooks are configured and the hook has not already been sent, send hook
   if (config.orderHook && !order.hookSent) {
      await hooker(order);
      await OrdersRepo.updateOne({
         query: { _id: getId(order._id) },
         set: { hookSent: true },
      });
   }

   let paymentView = `${config.themeViews}payment-complete`;
   if (order.orderPaymentGateway === 'Blockonomics')
      paymentView = `${config.themeViews}payment-complete-blockonomics`;
   res.render(paymentView, {
      title: 'Payment complete',
      config: req.app.config,
      session: req.session,
      result: order,
      message: clearSessionValue(req.session, 'message'),
      messageType: clearSessionValue(req.session, 'messageType'),
      helpers: req.handlebars.helpers,
      showFooter: 'showFooter',
      menu: sortMenu(await getMenu(db)),
   });
});

router.get('/emptycart', async (req, res, next) => {
   emptyCart(req, res, '');
});

router.get('/blockonomics_payment', (req, res, next) => {
   const config = req.app.config;
   let paymentType = '';
   if (req.session.cartSubscription) {
      paymentType = '_subscription';
   }

   // show bitcoin address and wait for payment, subscribing to wss
   res.render(`${config.themeViews}checkout-blockonomics`, {
      title: 'Checkout - Payment',
      config: req.app.config,
      paymentConfig: getPaymentConfig(),
      session: req.session,
      paymentPage: true,
      paymentType,
      cartClose: true,
      cartReadOnly: true,
      page: 'checkout-information',
      countryList,
      message: clearSessionValue(req.session, 'message'),
      messageType: clearSessionValue(req.session, 'messageType'),
      helpers: req.handlebars.helpers,
      showFooter: 'showFooter',
   });
});

// Gets the current cart
router.get('/cart/retrieve', async (req, res, next) => {
   // Get the cart from the DB using the session id
   let cart = await CartRepo.findOne({ sessionId: getId(req.session.id) });

   // Check for empty/null cart
   if (!cart) {
      cart = [];
   }

   res.status(200).json({ cart: cart.cart });
});

// search products
router.get('/search/:searchTerm/:pageNum?', (req, res) => {
   const db = req.app.db;
   const searchTerm = req.params.searchTerm;
   const productsIndex = req.app.productsIndex;
   const config = req.app.config;
   const numberProducts = config.productsPerPage ? config.productsPerPage : 6;

   const lunrIdArray = [];
   productsIndex.search(searchTerm).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
   });

   let pageNum = 1;
   if (req.params.pageNum) {
      pageNum = req.params.pageNum;
   }

   Promise.all([
      ProductRepo.paginate(
         true,
         pageNum,
         { _id: { $in: lunrIdArray } },
         getSort()
      ),
      getMenu(db),
   ])
      .then(([results, menu]) => {
         // If JSON query param return json instead
         if (req.query.json === 'true') {
            res.status(200).json(results.data);
            return;
         }

         res.render(`${config.themeViews}index`, {
            title: 'Results',
            results: results.data,
            filtered: true,
            session: req.session,
            metaDescription: `${req.app.config.cartTitle} - Search term: ${searchTerm}`,
            searchTerm: searchTerm,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            productsPerPage: numberProducts,
            totalProductCount: results.totalItems,
            pageNum: pageNum,
            paginateUrl: 'search',
            config: config,
            menu: sortMenu(menu),
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
         });
      })
      .catch((err) => {
         console.error(colors.red('Error searching for products', err));
      });
});

// search products
router.get('/category/:cat/:pageNum?', (req, res) => {
   const db = req.app.db;
   const searchTerm = req.params.cat;
   const productsIndex = req.app.productsIndex;
   const config = req.app.config;
   const numberProducts = config.productsPerPage ? config.productsPerPage : 6;

   const lunrIdArray = [];
   productsIndex.search(searchTerm).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
   });

   let pageNum = 1;
   if (req.params.pageNum) {
      pageNum = req.params.pageNum;
   }

   Promise.all([
      ProductRepo.paginate(
         true,
         pageNum,
         { _id: { $in: lunrIdArray } },
         getSort()
      ),
      getMenu(db),
   ])
      .then(([results, menu]) => {
         const sortedMenu = sortMenu(menu);

         // If JSON query param return json instead
         if (req.query.json === 'true') {
            res.status(200).json(results.data);
            return;
         }

         res.render(`${config.themeViews}index`, {
            title: `Category: ${searchTerm}`,
            results: results.data,
            filtered: true,
            session: req.session,
            searchTerm: searchTerm,
            metaDescription: `${req.app.config.cartTitle} - Category: ${searchTerm}`,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            productsPerPage: numberProducts,
            totalProductCount: results.totalItems,
            pageNum: pageNum,
            menuLink: _.find(sortedMenu.items, (obj) => {
               return obj.link === searchTerm;
            }),
            paginateUrl: 'category',
            config: config,
            menu: sortedMenu,
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
         });
      })
      .catch((err) => {
         console.error(colors.red('Error getting products for category', err));
      });
});

// Language setup in cookie
router.get('/lang/:locale', (req, res) => {
   res.cookie('locale', req.params.locale, { maxAge: 900000, httpOnly: true });
   res.redirect('back');
});

// return sitemap
router.get('/sitemap.xml', (req, res, next) => {
   const sm = require('sitemap');
   const config = req.app.config;

   addSitemapProducts(req, res, (err, products) => {
      if (err) {
         console.error(colors.red('Error generating sitemap.xml', err));
      }
      const sitemap = sm.createSitemap({
         hostname: config.baseUrl,
         cacheTime: 600000,
         urls: [{ url: '/', changefreq: 'weekly', priority: 1.0 }],
      });

      const currentUrls = sitemap.urls;
      const mergedUrls = currentUrls.concat(products);
      sitemap.urls = mergedUrls;
      // render the sitemap
      sitemap.toXML((err, xml) => {
         if (err) {
            return res.status(500).end();
         }
         res.header('Content-Type', 'application/xml');
         res.send(xml);
         return true;
      });
   });
});

router.get('/page/:pageNum', (req, res, next) => {
   const db = req.app.db;
   const config = req.app.config;
   const numberProducts = config.productsPerPage ? config.productsPerPage : 6;

   Promise.all([
      ProductRepo.paginate(true, req.params.pageNum, {}, getSort()),
      getMenu(db),
   ])
      .then(([results, menu]) => {
         // If JSON query param return json instead
         if (req.query.json === 'true') {
            res.status(200).json(results.data);
            return;
         }

         res.render(`${config.themeViews}index`, {
            title: 'Shop',
            results: results.data,
            session: req.session,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            metaDescription: `${req.app.config.cartTitle} - Products page: ${req.params.pageNum}`,
            config: req.app.config,
            productsPerPage: numberProducts,
            totalProductCount: results.totalItems,
            pageNum: req.params.pageNum,
            paginateUrl: 'page',
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: sortMenu(menu),
         });
      })
      .catch((err) => {
         console.error(colors.red('Error getting products for page', err));
      });
});

// The main entry point of the shop
router.get('/:page?', async (req, res, next) => {
   const db = req.app.db;
   const config = req.app.config;
   const numberProducts = config.productsPerPage ? config.productsPerPage : 6;

   // if no page is specified, just render page 1 of the cart
   if (!req.params.page) {
      Promise.all([
         ProductRepo.paginate(true, 1, {}, getSort()),
         productRepo.getFilters(),
         getMenu(db),
      ])
         .then(async ([results, filters, menu]) => {
            // If JSON query param return json instead
            if (req.query.json === 'true') {
               res.status(200).json(results.data);
               return;
            }

            res.render(`${config.themeViews}index`, {
               title: `${config.cartTitle} x- Shop`,
               theme: config.theme,
               filters: filters,
               results: results.data,
               session: req.session,
               message: clearSessionValue(req.session, 'message'),
               messageType: clearSessionValue(req.session, 'messageType'),
               config,
               productsPerPage: numberProducts,
               totalProductCount: results.totalItems,
               pageNum: 1,
               paginateUrl: 'page',
               helpers: req.handlebars.helpers,
               showFooter: 'showFooter',
               menu: sortMenu(menu),
            });
         })
         .catch((err) => {
            console.error(colors.red('Error getting products for page', err));
         });
   } else {
      if (req.params.page === 'admin') {
         next();
         return;
      }
      // lets look for a page
      const page = await PagesRepo.findOne({
         pageSlug: req.params.page,
         pageEnabled: 'true',
      });
      // if we have a page lets render it, else throw 404
      if (page) {
         res.render(`${config.themeViews}page`, {
            title: page.pageName,
            page: page,
            searchTerm: req.params.page,
            session: req.session,
            message: clearSessionValue(req.session, 'message'),
            messageType: clearSessionValue(req.session, 'messageType'),
            config: req.app.config,
            metaDescription: `${req.app.config.cartTitle} - ${page}`,
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: sortMenu(await getMenu(db)),
         });
      } else {
         res.status(404).render('error', {
            title: '404 Error - Page not found',
            config: req.app.config,
            message: '404 Error - Page not found',
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: sortMenu(await getMenu(db)),
         });
      }
   }
});

module.exports = router;

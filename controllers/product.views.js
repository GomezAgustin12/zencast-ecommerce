const { getId, clearSessionValue } = require('../lib/common');
const { sortMenu, getMenu } = require('../lib/menu');
const {
   CustomersRepo,
   ProductRepo,
   ReviewsRepo,
   VariantsRepo,
} = require('../repositories');
const { getRatingHtml } = require('../lib/modules/reviews-basic');
const stripHtml = require('string-strip-html');
const colors = require('colors');
const { getSort } = require('../lib/paginate');

const productViews = {
   product: async (req, res) => {
      const config = req.app.config;
      const productsIndex = req.app.productsIndex;
      const db = req.app.db;

      const product = await ProductRepo.findOne({
         $or: [
            { _id: getId(req.params.id) },
            { productPermalink: req.params.id },
         ],
      });
      if (!product) {
         res.render('error', {
            title: 'Not found',
            message: 'Product not found',
            helpers: req.handlebars.helpers,
            config,
         });
         return;
      }
      if (product.productPublished === false) {
         res.render('error', {
            title: 'Not found',
            message: 'Product not found',
            helpers: req.handlebars.helpers,
            config,
         });
         return;
      }

      // Get variants for this product
      const variants = await VariantsRepo.findMany({
         query: { product: product._id },
         sort: { added: 1 },
      });

      // Grab review data
      const reviews = {
         reviews: [],
         average: 0,
         count: 0,
         featured: {},
         ratingHtml: '',
         highestRating: 0,
      };
      if (config.modules.enabled.reviews) {
         reviews.reviews = await ReviewsRepo.findMany({
            query: { product: product._id },
            sort: { date: 1 },
            limit: 5,
         });

         // only aggregate if reviews are found
         if (reviews.reviews.length > 0) {
            reviews.highestRating = await ReviewsRepo.findMany({
               query: { product: product._id },
               sort: { rating: -1 },
               limit: 1,
            });

            if (reviews.highestRating.length > 0) {
               reviews.highestRating = reviews.highestRating[0].rating;
            }
            const featuredReview = await ReviewsRepo.findMany({
               query: { product: product._id },
               sort: { date: -1 },
               limit: 1,
            });

            if (featuredReview.length > 0) {
               reviews.featured.review = featuredReview[0];
               reviews.featured.customer = await CustomersRepo.findOne({
                  _id: reviews.featured.review.customer,
               });
            }
            const reviewRating = await ReviewsRepo.reviewRating(product._id);
            reviews.count = await ReviewsRepo.countDocuments({
               product: product._id,
            });
            // Assign if returned
            if (reviewRating.length > 0 && reviewRating[0].avgRating) {
               reviews.average = reviewRating[0].avgRating;
            }
         }
         // Set review html
         reviews.ratingHtml = getRatingHtml(Math.round(reviews.average));
      }

      // If JSON query param return json instead
      if (req.query.json === 'true') {
         res.status(200).json(product);
         return;
      }

      // show the view
      const images = await ProductRepo.getFiles(product._id, 'productImages');

      // Related products
      let relatedProducts = {};
      if (config.showRelatedProducts) {
         const lunrIdArray = [];
         const productTags = product.productTags.split(',');
         const productTitleWords = product.productTitle.split(' ');
         const searchWords = productTags.concat(productTitleWords);
         searchWords.forEach((word) => {
            try {
               const results = productsIndex.search(word);
               results.forEach((id) => {
                  lunrIdArray.push(getId(id.ref));
               });
            } catch (e) {
               console.log('lunr search query error');
            }
         });
         relatedProducts = await ProductRepo.findMany({
            query: { _id: { $in: lunrIdArray, $ne: product._id } },
            limit: 4,
         });
      }

      res.render(`${config.themeViews}product`, {
         title: product.productTitle,
         result: product,
         variants,
         reviews,
         images: images,
         techFeatures: product.techFeatures,
         relatedProducts,
         productDescription: stripHtml(product.productDescription),
         metaDescription: `${config.cartTitle} - ${product.productTitle}`,
         config: config,
         session: req.session,
         pageUrl: config.baseUrl + req.originalUrl,
         message: clearSessionValue(req.session, 'message'),
         messageType: clearSessionValue(req.session, 'messageType'),
         helpers: req.handlebars.helpers,
         showFooter: 'showFooter',
         menu: sortMenu(await getMenu(db)),
      });
   },
   show: (req, res) => {
      const db = req.app.db;
      const searchTerm = req.params.searchTerm;
      let filterTerms = req.params.filterTerms
         ? JSON.parse(req.params.filterTerms)
         : {};

      filterTerms = Object.keys(filterTerms).reduce((accum, current) => {
         accum[current] = filterTerms[current].split('-').join(' ');
         return accum;
      }, {});

      const sortOrder = req.params.sortOrder;
      const productsIndex = req.app.productsIndex;
      const config = req.app.config;
      const numberProducts = config.productsPerPage
         ? config.productsPerPage
         : 6;

      const lunrIdArray = [];
      if (searchTerm) {
         productsIndex.search(searchTerm).forEach((id) => {
            lunrIdArray.push(getId(id.ref));
         });
      }

      //I should find a more general solution to number fields
      if (filterTerms.productElectricityUsage) {
         filterTerms.productElectricityUsage =
            +filterTerms.productElectricityUsage;
      }

      let pageNum = 1;
      if (req.params.pageNum) {
         pageNum = req.params.pageNum;
      }

      Promise.all([
         ProductRepo.paginate(
            true,
            pageNum,
            searchTerm ? { _id: { $in: lunrIdArray } } : {},
            sortOrder ? getSort(sortOrder) : getSort(),
            filterTerms
         ),
         ProductRepo.getFilters(
            searchTerm ? { _id: { $in: lunrIdArray } } : {},
            filterTerms
         ),
         getMenu(db),
      ])
         .then(([results = [], filters, menu]) => {
            // If JSON query param return json instead
            if (req.query.json === 'true') {
               res.status(200).json(results.data);
               return;
            }

            res.render(`${config.themeViews}index`, {
               title: 'Results',
               results: results.data,
               filters,
               filtered: true,
               sortOrder,
               session: req.session,
               metaDescription: `${req.app.config.cartTitle} - Search term: ${searchTerm}`,
               searchTerm: searchTerm,
               message: clearSessionValue(req.session, 'message'),
               messageType: clearSessionValue(req.session, 'messageType'),
               productsPerPage: numberProducts,
               totalProductCount: results.totalItems,
               pageNum: pageNum,
               paginateUrl: 'product',
               config: config,
               menu: sortMenu(menu),
               helpers: req.handlebars.helpers,
               showFooter: 'showFooter',
            });
         })
         .catch((err) => {
            console.error(colors.red('Error searching for products', err));
         });
   },
};

module.exports = productViews;

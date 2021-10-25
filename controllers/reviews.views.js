const { getId, clearSessionValue } = require('../lib/common');

const { paginateData } = require('../lib/paginate');
const { ReviewsRepo } = require('../repositories');

const reviewsViews = {
   page: async (req, res, next) => {
      let pageNum = 1;
      if (req.params.page) {
         pageNum = req.params.page;
      }

      // Get our paginated data
      const reviews = await paginateData(
         false,
         req,
         pageNum,
         'reviews',
         {},
         { date: -1 }
      );

      res.render('reviews', {
         title: 'Cart - Reviews',
         results: reviews.data,
         totalItemCount: reviews.totalItems,
         pageNum,
         paginateUrl: 'admin/review',
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
      const reviewsIndex = req.app.reviewsIndex;

      const lunrIdArray = [];
      reviewsIndex.search(searchTerm).forEach((id) => {
         lunrIdArray.push(getId(id.ref));
      });

      // we search on the lunr indexes
      const results = await ReviewsRepo.findMany({
         query: { _id: { $in: lunrIdArray } },
      });

      if (req.apiAuthenticated) {
         res.status(200).json(results);
         return;
      }

      res.render('reviews', {
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
};

module.exports = reviewsViews;

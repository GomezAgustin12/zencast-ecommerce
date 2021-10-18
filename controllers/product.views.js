const { getId, clearSessionValue } = require("../lib/common");
const {
  CustomersRepo,
  ProductRepo,
  ReviewsRepo,
  VariantsRepo,
} = require("../repositories");

const productViews = {
  product: async (req, res) => {
    const config = req.app.config;
    const productsIndex = req.app.productsIndex;

    const product = await ProductRepo.findOne({
      $or: [{ _id: getId(req.params.id) }, { productPermalink: req.params.id }],
    });
    if (!product) {
      res.render("error", {
        title: "Not found",
        message: "Product not found",
        helpers: req.handlebars.helpers,
        config,
      });
      return;
    }
    if (product.productPublished === false) {
      res.render("error", {
        title: "Not found",
        message: "Product not found",
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
      ratingHtml: "",
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
        const reviewRating = ReviewsRepo.reviewRating;
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
    if (req.query.json === "true") {
      res.status(200).json(product);
      return;
    }

    // show the view
    const images = await getImages(product._id, req, res);

    // Related products
    let relatedProducts = {};
    if (config.showRelatedProducts) {
      const lunrIdArray = [];
      const productTags = product.productTags.split(",");
      const productTitleWords = product.productTitle.split(" ");
      const searchWords = productTags.concat(productTitleWords);
      searchWords.forEach((word) => {
        try {
          const results = productsIndex.search(word);
          results.forEach((id) => {
            lunrIdArray.push(getId(id.ref));
          });
        } catch (e) {
          console.log("lunr search query error");
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
      relatedProducts,
      productDescription: stripHtml(product.productDescription),
      metaDescription: `${config.cartTitle} - ${product.productTitle}`,
      config: config,
      session: req.session,
      pageUrl: config.baseUrl + req.originalUrl,
      message: clearSessionValue(req.session, "message"),
      messageType: clearSessionValue(req.session, "messageType"),
      helpers: req.handlebars.helpers,
      showFooter: "showFooter",
      menu: sortMenu(await getMenu(db)),
    });
  },
};

module.exports = productViews;

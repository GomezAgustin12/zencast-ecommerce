const moment = require("moment");
const fs = require("fs");
const path = require("path");
const mime = require("mime-type/with-db");
const util = require("util");
const stream = require("stream");
const { validateJson } = require("../lib/schema");
const {
  getId,
  allowedMimeType,
  fileSizeLimit,
  checkDirectorySync,
  sendEmail,
} = require("../lib/common");
const { getConfig, updateConfig } = require("../lib/config");
const { newMenu, updateMenu, deleteMenu, orderMenu } = require("../lib/menu");
const ObjectId = require("mongodb").ObjectID;
const {
  UserRepo,
  PagesRepo,
  ProductRepo,
  DiscountRepo,
  CustomersRepo,
  OrdersRepo,
} = require("../repositories");

const settingsCtrl = {
  apiKey: async (req, res) => {
    const result = await UserRepo.updateOne({
      query: {
        _id: ObjectId(req.session.userId),
        isAdmin: true,
      },
      set: { apiKey: new ObjectId() },
    });

    if (result.value && result.value.apiKey) {
      res
        .status(200)
        .json({ message: "API Key generated", apiKey: result.value.apiKey });
      return;
    }
    res.status(400).json({ message: "Failed to generate API Key" });
  },

  update: (req, res) => {
    const result = updateConfig(req.body);
    if (result === true) {
      req.app.config = getConfig();
      res.status(200).json({ message: "Settings successfully updated" });
      return;
    }
    res.status(400).json({ message: "Permission denied" });
  },

  pageSettings: async (req, res) => {
    const doc = {
      pageName: req.body.pageName,
      pageSlug: req.body.pageSlug,
      pageEnabled: req.body.pageEnabled,
      pageContent: req.body.pageContent,
    };

    if (req.body.pageId) {
      // existing page
      const page = await PagesRepo.findOne({ _id: getId(req.body.pageId) });
      if (!page) {
        res.status(400).json({ message: "Page not found" });
        return;
      }

      try {
        const updatedPage = await PagesRepo.updateOne({
          query: { _id: getId(req.body.pageId) },
          set: doc,
        });
        res.status(200).json({
          message: "Page updated successfully",
          pageId: req.body.pageId,
          page: updatedPage.value,
        });
      } catch (ex) {
        res
          .status(400)
          .json({ message: "Error updating page. Please try again." });
      }
    } else {
      // insert page
      try {
        const newDoc = await PagesRepo.create(doc);
        res.status(200).json({
          message: "New page successfully created",
          pageId: newDoc.insertedId,
        });
        return;
      } catch (ex) {
        res
          .status(400)
          .json({ message: "Error creating page. Please try again." });
      }
    }
  },
  deletePage: async (req, res) => {
    const page = await PagesRepo.findOne({ _id: getId(req.body.pageId) });
    if (!page) {
      res.status(400).json({ message: "Page not found" });
      return;
    }

    try {
      await PagesRepo.delete(getId(req.body.pageId));
      res.status(200).json({ message: "Page successfully deleted" });
      return;
    } catch (ex) {
      res
        .status(400)
        .json({ message: "Error deleting page. Please try again." });
    }
  },

  newMenu: (req, res) => {
    const result = newMenu(req);
    if (result === false) {
      res.status(400).json({ message: "Failed creating menu." });
      return;
    }
    res.status(200).json({ message: "Menu created successfully." });
  },

  updateMenu: (req, res) => {
    const result = updateMenu(req);
    if (result === false) {
      res.status(400).json({ message: "Failed updating menu." });
      return;
    }
    res.status(200).json({ message: "Menu updated successfully." });
  },

  deleteMenu: (req, res) => {
    const result = deleteMenu(req, req.body.menuId);
    if (result === false) {
      res.status(400).json({ message: "Failed deleting menu." });
      return;
    }
    res.status(200).json({ message: "Menu deleted successfully." });
  },

  saveOrder: (req, res) => {
    const result = orderMenu(req, res);
    if (result === false) {
      res.status(400).json({ message: "Failed saving menu order" });
      return;
    }
    res.status(200).json({});
  },

  validatePermalink: async (req, res) => {
    // if doc id is provided it checks for permalink in any products other that one provided,
    // else it just checks for any products with that permalink

    let query = {};
    if (typeof req.body.docId === "undefined" || req.body.docId === "") {
      query = { productPermalink: req.body.permalink };
    } else {
      query = {
        productPermalink: req.body.permalink,
        _id: { $ne: getId(req.body.docId) },
      };
    }

    const products = await ProductRepo.countDocuments(query);
    if (products && products > 0) {
      res.status(400).json({ message: "Permalink already exists" });
      return;
    }
    res.status(200).json({ message: "Permalink validated successfully" });
  },

  updateDiscounts: async (req, res) => {
    // Doc to insert
    const discountDoc = {
      discountId: req.body.discountId,
      code: req.body.code,
      type: req.body.type,
      value: parseInt(req.body.value),
      start: moment(req.body.start, "DD/MM/YYYY HH:mm").toDate(),
      end: moment(req.body.end, "DD/MM/YYYY HH:mm").toDate(),
    };

    // Validate the body again schema
    const schemaValidate = validateJson("editDiscount", discountDoc);
    if (!schemaValidate.result) {
      res.status(400).json(schemaValidate.errors);
      return;
    }

    // Check start is after today
    if (moment(discountDoc.start).isBefore(moment())) {
      res
        .status(400)
        .json({ message: "Discount start date needs to be after today" });
      return;
    }

    // Check end is after the start
    if (!moment(discountDoc.end).isAfter(moment(discountDoc.start))) {
      res
        .status(400)
        .json({ message: "Discount end date needs to be after start date" });
      return;
    }

    // Check if code exists
    const checkCode = await DiscountRepo.countDocuments({
      code: discountDoc.code,
      _id: { $ne: getId(discountDoc.discountId) },
    });
    if (checkCode) {
      res.status(400).json({ message: "Discount code already exists" });
      return;
    }

    // Remove discountID
    delete discountDoc.discountId;

    try {
      await DiscountRepo.updateOne(
        { _id: getId(req.body.discountId) },
        discountDoc
      );
      res
        .status(200)
        .json({ message: "Successfully saved", discount: discountDoc });
    } catch (ex) {
      res.status(400).json({ message: "Failed to save. Please try again" });
    }
  },

  createDiscount: async (req, res) => {
    // Doc to insert
    const discountDoc = {
      code: req.body.code,
      type: req.body.type,
      value: parseInt(req.body.value),
      start: moment(req.body.start, "DD/MM/YYYY HH:mm").toDate(),
      end: moment(req.body.end, "DD/MM/YYYY HH:mm").toDate(),
    };

    // Validate the body again schema
    const schemaValidate = validateJson("newDiscount", discountDoc);
    if (!schemaValidate.result) {
      res.status(400).json(schemaValidate.errors);
      return;
    }

    // Check if code exists
    const checkCode = await DiscountRepo.countDocuments({
      code: discountDoc.code,
    });
    if (checkCode) {
      res.status(400).json({ message: "Discount code already exists" });
      return;
    }

    // Check start is after today
    if (moment(discountDoc.start).isBefore(moment())) {
      res
        .status(400)
        .json({ message: "Discount start date needs to be after today" });
      return;
    }

    // Check end is after the start
    if (!moment(discountDoc.end).isAfter(moment(discountDoc.start))) {
      res
        .status(400)
        .json({ message: "Discount end date needs to be after start date" });
      return;
    }

    // Insert discount code
    const discount = await DiscountRepo.create(discountDoc);
    res.status(200).json({
      message: "Discount code created successfully",
      discountId: discount.insertedId,
    });
  },

  deleteDiscount: async (req, res) => {
    try {
      await DiscountRepo.delete(getId(req.body.discountId));
      res.status(200).json({ message: "Discount code successfully deleted" });
      return;
    } catch (ex) {
      res
        .status(400)
        .json({ message: "Error deleting discount code. Please try again." });
    }
  },

  fileUpload: async (req, res) => {
    if (req.file) {
      const file = req.file;

      // Get the mime type of the file
      const mimeType = mime.lookup(file.originalname);

      // Check for allowed mime type and file size
      if (!allowedMimeType.includes(mimeType) || file.size > fileSizeLimit) {
        // Remove temp file
        fs.unlinkSync(file.path);

        // Return error
        res.status(400).json({
          message: "File type not allowed or too large. Please try again.",
        });
        return;
      }

      // get the product form the DB
      const product = await ProductRepo.findOne({
        _id: getId(req.body.productId),
      });
      if (!product) {
        // delete the temp file.
        fs.unlinkSync(file.path);

        // Return error
        res
          .status(400)
          .json({ message: "File upload error. Please try again." });
        return;
      }

      const productPath = product._id.toString();
      const uploadDir = path.join("public/uploads", productPath);

      // Check directory and create (if needed)
      checkDirectorySync(uploadDir);

      // Setup the new path
      const imagePath = path.join(
        "/uploads",
        productPath,
        file.originalname.replace(/ /g, "_")
      );

      // save the new file
      const dest = fs.createWriteStream(
        path.join(uploadDir, file.originalname.replace(/ /g, "_"))
      );
      const pipeline = util.promisify(stream.pipeline);

      try {
        await pipeline(fs.createReadStream(file.path), dest);

        // delete the temp file.
        fs.unlinkSync(file.path);

        // if there isn't a product featured image, set this one
        if (!product.productImage) {
          await ProductRepo.updateOne({
            query: { _id: getId(req.body.productId) },
            set: { productImage: imagePath },
          });
        }
        res.status(200).json({ message: "File uploaded successfully" });
      } catch (ex) {
        console.log("Failed to upload the file", ex);
        res
          .status(400)
          .json({ message: "File upload error. Please try again." });
      }
    } else {
      // Return error
      console.log("fail", req.file);
      res.status(400).json({ message: "File upload error. Please try again." });
    }
  },

  testEmail: (req, res) => {
    const config = req.app.config;
    // TODO: Should fix this to properly handle result
    sendEmail(
      config.emailAddress,
      "expressCart test email",
      "Your email settings are working"
    );
    res.status(200).json({ message: "Test email sent" });
  },

  searchAll: async (req, res, next) => {
    const searchValue = req.body.searchValue;
    const limitReturned = 5;

    // Empty arrays
    let customers = [];
    let orders = [];
    let products = [];

    // Default queries
    const customerQuery = {};
    const orderQuery = {};
    const productQuery = {};

    // If an ObjectId is detected use that
    if (ObjectId.isValid(req.body.searchValue)) {
      // Get customers
      customers = await CustomersRepo.findMany({
        query: { _id: ObjectId(searchValue) },
        sort: { created: 1 },
        limit: limitReturned,
      });

      // Get orders
      orders = await OrdersRepo.findMany({
        query: { _id: ObjectId(searchValue) },
        sort: { orderDate: 1 },
        limit: limitReturned,
      });

      // Get products
      products = await ProductRepo.findMany({
        query: { _id: ObjectId(searchValue) },
        sort: { productAddedDate: 1 },
        limit: limitReturned,
      });

      return res.status(200).json({
        customers,
        orders,
        products,
      });
    }

    // If email address is detected
    if (emailRegex.test(req.body.searchValue)) {
      customerQuery.email = searchValue;
      orderQuery.orderEmail = searchValue;
    } else if (numericRegex.test(req.body.searchValue)) {
      // If a numeric value is detected
      orderQuery.amount = req.body.searchValue;
      productQuery.productPrice = req.body.searchValue;
    } else {
      // String searches
      customerQuery.$or = [
        { firstName: { $regex: new RegExp(searchValue, "img") } },
        { lastName: { $regex: new RegExp(searchValue, "img") } },
      ];
      orderQuery.$or = [
        { orderFirstname: { $regex: new RegExp(searchValue, "img") } },
        { orderLastname: { $regex: new RegExp(searchValue, "img") } },
      ];
      productQuery.$or = [
        { productTitle: { $regex: new RegExp(searchValue, "img") } },
        { productDescription: { $regex: new RegExp(searchValue, "img") } },
      ];
    }

    // Get customers
    if (Object.keys(customerQuery).length > 0) {
      customers = await CustomersRepo.findMany({
        query: customerQuery,
        sort: { created: 1 },
        limit: limitReturned,
      });
    }

    // Get orders
    if (Object.keys(orderQuery).length > 0) {
      orders = await OrdersRepo.findMany({
        query: orderQuery,
        sort: { orderDate: 1 },
        limit: limitReturned,
      });
    }

    // Get products
    if (Object.keys(productQuery).length > 0) {
      products = await ProductRepo.findMany({
        query: productQuery,
        sort: { productAddedDate: 1 },
        limit: limitReturned,
      });
    }

    return res.status(200).json({
      customers,
      orders,
      products,
    });
  },
};
module.exports = settingsCtrl;

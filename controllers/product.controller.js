const {
   emptyCart,
   updateTotalCart,
   updateSubscriptionCheck,
} = require('../lib/cart');
const { getId } = require('../lib/common');
const { createReview } = require('../lib/modules/reviews-basic');

const colors = require('colors');
const stripHtml = require('string-strip-html');

const { CartRepo, ProductRepo, VariantsRepo } = require('../repositories');

const _ = require('lodash');

const productCtrl = {
   updatecart: async (req, res) => {
      const config = req.app.config;
      const cartItem = req.body;

      // Check cart exists
      if (!req.session.cart) {
         emptyCart(
            req,
            res,
            'json',
            'There are no items if your cart or your cart is expired'
         );
         return;
      }

      const product = await ProductRepo.findOne({
         _id: getId(cartItem.productId),
      });
      if (!product) {
         res.status(400).json({
            message: 'There was an error updating the cart',
            totalCartItems: Object.keys(req.session.cart).length,
         });
         return;
      }

      // Calculate the quantity to update
      let productQuantity = cartItem.quantity ? cartItem.quantity : 1;
      if (typeof productQuantity === 'string') {
         productQuantity = parseInt(productQuantity);
      }

      if (productQuantity === 0) {
         // quantity equals zero so we remove the item
         delete req.session.cart[cartItem.cartId];
         res.status(400).json({
            message: 'There was an error updating the cart',
            totalCartItems: Object.keys(req.session.cart).length,
         });
         return;
      }

      // Check for a cart
      if (!req.session.cart[cartItem.cartId]) {
         res.status(400).json({
            message: 'There was an error updating the cart',
            totalCartItems: Object.keys(req.session.cart).length,
         });
         return;
      }

      const cartProduct = req.session.cart[cartItem.cartId];

      // Set default stock
      let productStock = product.productStock;
      let productPrice = parseFloat(product.productPrice).toFixed(2);

      // Check if a variant is supplied and override values
      if (cartProduct.variantId) {
         const variant = await VariantsRepo.findOne({
            _id: getId(cartProduct.variantId),
            product: getId(product._id),
         });
         if (!variant) {
            res.status(400).json({
               message: 'Error updating cart. Please try again.',
            });
            return;
         }
         productPrice = parseFloat(variant.price).toFixed(2);
         productStock = variant.stock;
      }

      // If stock management on check there is sufficient stock for this product
      if (config.trackStock === false) {
         // Only if not disabled
         if (product.productStockDisable !== true && productStock) {
            // If there is more stock than total (ignoring held)
            if (productQuantity > productStock) {
               res.status(400).json({
                  message: 'There is insufficient stock of this product.',
               });
               return;
            }

            // Aggregate our current stock held from all users carts
            const stockHeld = CartRepo.stockHeld(req.session.id);

            // If there is stock
            if (stockHeld.length > 0) {
               const totalHeld = _.find(stockHeld, [
                  '_id',
                  getId(cartItem.cartId),
               ]).sumHeld;
               const netStock = productStock - totalHeld;

               // Check there is sufficient stock
               if (productQuantity > netStock) {
                  res.status(400).json({
                     message: 'There is insufficient stock of this product.',
                  });
                  return;
               }
            }
         }
      }

      // Update the cart
      req.session.cart[cartItem.cartId].quantity = productQuantity;
      req.session.cart[cartItem.cartId].totalItemPrice =
         productPrice * productQuantity;

      // update total cart amount
      await updateTotalCart(req, res);

      // Update checking cart for subscription
      updateSubscriptionCheck(req, res);

      // Update cart to the DB
      await CartRepo.updateOne({
         query: { sessionId: req.session.id },
         set: { cart: req.session.cart },
      });

      res.status(200).json({
         message: 'Cart successfully updated',
         totalCartItems: Object.keys(req.session.cart).length,
      });
   },

   removefromcart: async (req, res) => {
      // Check for item in cart
      if (!req.session.cart[req.body.cartId]) {
         return res.status(400).json({ message: 'Product not found in cart' });
      }

      // remove item from cart
      delete req.session.cart[req.body.cartId];

      // If not items in cart, empty it
      if (Object.keys(req.session.cart).length === 0) {
         return emptyCart(req, res, 'json');
      }

      // Update cart in DB
      await CartRepo.updateOne({
         query: { sessionId: req.session.id },
         set: { cart: req.session.cart },
      });
      // update total cart
      await updateTotalCart(req, res);

      // Update checking cart for subscription
      updateSubscriptionCheck(req, res);

      return res.status(200).json({
         message: 'Product successfully removed',
         totalCartItems: Object.keys(req.session.cart).length,
      });
   },
   addtocart: async (req, res) => {
      try {
         const config = req.app.config;
         let productQuantity = req.body.productQuantity
            ? parseInt(req.body.productQuantity)
            : 1;
         const productComment = req.body.productComment
            ? req.body.productComment
            : null;

         // If maxQuantity set, ensure the quantity doesn't exceed that value
         if (config.maxQuantity && productQuantity > config.maxQuantity) {
            return res.status(400).json({
               message:
                  'The quantity exceeds the max amount. Please contact us for larger orders.',
            });
         }

         // Don't allow negative quantity
         if (productQuantity < 1) {
            productQuantity = 1;
         }

         // setup cart object if it doesn't exist
         if (!req.session.cart) {
            req.session.cart = {};
         }

         // Get the product from the DB
         const product = await ProductRepo.findOne({
            _id: getId(req.body.productId),
         });

         // No product found
         if (!product) {
            return res.status(400).json({
               message: 'Error updating cart. Please try again.',
            });
         }

         // If cart already has a subscription you cannot add anything else
         if (req.session.cartSubscription) {
            return res.status(400).json({
               message:
                  'Subscription already existing in cart. You cannot add more.',
            });
         }

         // If existing cart isn't empty check if product is a subscription
         if (Object.keys(req.session.cart).length !== 0) {
            if (product.productSubscription) {
               return res.status(400).json({
                  message:
                     'You cannot combine subscription products with existing in your cart. Empty your cart and try again.',
               });
            }
         }

         // Variant checks
         let productCartId = product._id.toString();
         let productPrice = parseFloat(product.productPrice).toFixed(2);
         let productVariantId;
         let productVariantTitle;
         let productStock = product.productStock;

         // Check if a variant is supplied and override values
         if (req.body.productVariant) {
            const variant = await VariantsRepo.findOne({
               _id: getId(req.body.productVariant),
               product: getId(req.body.productId),
            });
            if (!variant) {
               return res.status(400).json({
                  message: 'Error updating cart. Variant not found.',
               });
            }
            productVariantId = getId(req.body.productVariant);
            productVariantTitle = variant.title;
            productCartId = req.body.productVariant;
            productPrice = parseFloat(variant.price).toFixed(2);
            productStock = variant.stock;
         }

         // If stock management on check there is sufficient stock for this product
         if (config.trackStock) {
            //esto esta en false en la config (settings.json)
            // Only if not disabled
            if (product.productStockDisable !== true && productStock) {
               //no existe el campo "productStockDisable" en el modelo y nose de donde saca los datos
               // If there is more stock than total (ignoring held)
               if (productQuantity > productStock) {
                  return res.status(400).json({
                     message: 'There is insufficient stock of this product.',
                  });
               }

               // Aggregate our current stock held from all users carts
               const stockHeld = CartRepo.stockHeldCtrl();

               // If there is stock
               if (stockHeld.length > 0) {
                  const heldProduct = _.find(stockHeld, [
                     '_id',
                     getId(productCartId),
                  ]);
                  if (heldProduct) {
                     const netStock = productStock - heldProduct.sumHeld;

                     // Check there is sufficient stock
                     if (productQuantity > netStock) {
                        return res.status(400).json({
                           message:
                              'There is insufficient stock of this product.',
                        });
                     }
                  }
               }
            }
         }

         // if exists we add to the existing value
         let cartQuantity = 0;
         if (req.session.cart[productCartId]) {
            cartQuantity =
               parseInt(req.session.cart[productCartId].quantity) +
               productQuantity;
            req.session.cart[productCartId].quantity = cartQuantity;
            req.session.cart[productCartId].totalItemPrice =
               productPrice *
               parseInt(req.session.cart[productCartId].quantity);
         } else {
            // Set the card quantity
            cartQuantity = productQuantity;

            // new product deets
            const productObj = {};
            productObj.productId = product._id;
            productObj.title = product.productTitle;
            productObj.quantity = productQuantity;
            productObj.totalItemPrice = productPrice * productQuantity;
            productObj.productImage = product.productImage;
            productObj.productComment = productComment;
            productObj.productSubscription = product.productSubscription;
            productObj.variantId = productVariantId;
            productObj.variantTitle = productVariantTitle;
            if (product.productPermalink) {
               productObj.link = product.productPermalink;
            } else {
               productObj.link = product._id;
            }

            // merge into the current cart
            req.session.cart[productCartId] = productObj;
         }

         // Update cart to the DB
         await CartRepo.updateOne({
            query: { sessionId: req.session.id },
            set: { cart: req.session.cart },
            options: { upsert: true },
         });

         // update total cart amount
         await updateTotalCart(req, res);

         // Update checking cart for subscription
         updateSubscriptionCheck(req, res);

         if (product.productSubscription) {
            req.session.cartSubscription = product.productSubscription;
         }

         return res.status(200).json({
            message: 'Cart successfully updated',
            cartId: productCartId,
            totalCartItems: req.session.totalCartItems,
         });
      } catch (error) {
         console.error(colors.red('Failed to insert customer: ', error));
         res.status(400).json({ message: error.message });
      }
   },
   addreview: async (req, res, next) => {
      const config = req.app.config;

      // Check if module enabled
      if (config.modules.enabled.reviews) {
         // Check if a customer is logged in
         if (!req.session.customerPresent) {
            return res.status(400).json({
               message: 'You need to be logged in to create a review',
            });
         }

         // Validate inputs
         if (!req.body.title) {
            return res.status(400).json({
               message: 'Please supply a review title',
            });
         }
         if (!req.body.description) {
            return res.status(400).json({
               message: 'Please supply a review description',
            });
         }
         if (!req.body.rating) {
            return res.status(400).json({
               message: 'Please supply a review rating',
            });
         }

         // Sanitize inputs
         req.body.title = stripHtml(req.body.title);
         req.body.description = stripHtml(req.body.description);

         // Validate length
         if (req.body.title.length > 50) {
            return res.status(400).json({
               message: 'Review title is too long',
            });
         }
         if (req.body.description.length > 200) {
            return res.status(400).json({
               message: 'Review description is too long',
            });
         }

         // Check rating is within range
         try {
            const rating = parseInt(req.body.rating);
            if (rating < 0 || rating > 5) {
               return res.status(400).json({
                  message: 'Please supply a valid rating',
               });
            }

            // Check for failed Int conversion
            if (isNaN(rating)) {
               return res.status(400).json({
                  message: 'Please supply a valid rating',
               });
            }

            // Set rating to be numeric
            req.body.rating = rating;
         } catch (ex) {
            return res.status(400).json({
               message: 'Please supply a valid rating',
            });
         }

         // Checks passed, create the review
         const response = await createReview(req);
         if (response.error) {
            return res.status(400).json({
               message: response.error,
            });
         }
         return res.json({
            message: 'Review successfully submitted',
         });
      }
      return res.status(400).json({
         message: 'Unable to submit review',
      });
   },
};

module.exports = productCtrl;

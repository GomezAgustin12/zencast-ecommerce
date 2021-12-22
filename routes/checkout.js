const express = require('express');
const router = express.Router();
const checkoutService = require('../controllers/checkout.service');
const checoutViews = require('../controllers/checkout.views');
const colors = require('colors');

router.get('/checkout/information', checoutViews.information);
router.get('/checkout/shipping', checoutViews.shipping);
router.get('/checkout/cart', checoutViews.cart);
router.get('/checkout/payment', checoutViews.payment);

router.post('/checkout/adddiscountcode', async (req, res) => {
   try {
      const response = await checkoutService.addDiscountCode(req);

      res.status(200).json(response);
   } catch (error) {
      console.error('🔥🔥', colors.red(`${error}`));
      res.status(400).json({
         message: `${error.message}`,
      });
   }
});
router.get('/checkout/cartData', async (req, res) => {
   try {
      const response = await checkoutService.cartData(req);
      res.status(200).json(response);
   } catch (error) {
      console.error('🔥🔥', colors.red(`${error}`));
      res.status(400).json({
         message: `${error.message}`,
      });
   }
});

router.post('/checkout/removediscountcode', async (req, res) => {
   try {
      const response = await checkoutService.removeDiscountCode(req, res);
      res.status(200).json(response);
   } catch (error) {
      console.error('🔥🔥', colors.red(`${error}`));
      res.status(400).json({
         message: `${error.message}`,
      });
   }
});

router.post('/checkout/confirmwiretransfer', async (req, res) => {
   try {
      await checkoutService.confirmWireTransfer(req, res);
      res.status(200).json({ message: 'Order created' });
   } catch (error) {
      console.error('🔥🔥', colors.red(`${error}`));
      res.status(400).json({
         message: `${error.message}`,
      });
   }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { restrict, checkAccess } = require('../../lib/auth');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });
const settingsCtrl = require('../../controllers/settings.controller');
const settingsViews = require('../../controllers/settings.views');

// settings
router.get('/', csrfProtection, restrict, settingsViews.settings);

// settings update
router.post('/update', restrict, checkAccess, settingsCtrl.update);

// settings menu
router.get('/menu', csrfProtection, restrict, settingsViews.menuSettings);

// page list
router.get('/pages', csrfProtection, restrict, settingsViews.pagesSettings);

router.get(
   '/banking-account-data',
   csrfProtection,
   restrict,
   settingsViews.bankDetails
);

router.post(
   '/banking-account-data',
   restrict,
   checkAccess,
   settingsCtrl.bankDetails
);

// pages new
router.get(
   '/pages/new',
   csrfProtection,
   restrict,
   checkAccess,
   settingsViews.newPages
);

// pages editor
router.get(
   '/pages/edit/:page',
   csrfProtection,
   restrict,
   checkAccess,
   settingsViews.editPages
);

// insert/update page
router.post('/page', restrict, checkAccess, settingsCtrl.pageSettings);

// delete a page
router.post('/page/delete', restrict, checkAccess, settingsCtrl.deletePage);

// new menu item
router.post('/menu/new', restrict, checkAccess, settingsCtrl.newMenu);

// update existing menu item
router.post('/menu/update', restrict, checkAccess, settingsCtrl.updateMenu);

// delete menu item
router.post('/menu/delete', restrict, checkAccess, settingsCtrl.deleteMenu);

// We call this via a Ajax call to save the order from the sortable list
router.post('/menu/saveOrder', restrict, checkAccess, settingsCtrl.saveOrder);

// Discount codes
router.get(
   '/discounts',
   csrfProtection,
   checkAccess,
   restrict,
   settingsViews.discounts
);

// Edit a discount code
router.get(
   '/discount/edit/:id',
   csrfProtection,
   restrict,
   checkAccess,
   settingsViews.editDiscount
);

// Update discount code
router.post(
   '/discount/update',
   restrict,
   checkAccess,
   settingsCtrl.updateDiscounts
);

// Create a discount code
router.get(
   '/discount/new',
   csrfProtection,
   restrict,
   checkAccess,
   settingsViews.newDiscount
);

// Create a discount code
router.post(
   '/discount/create',
   csrfProtection,
   restrict,
   checkAccess,
   settingsCtrl.createDiscount
);

// Delete discount code
router.delete(
   '/discount/delete',
   restrict,
   checkAccess,
   settingsCtrl.deleteDiscount
);

module.exports = router;

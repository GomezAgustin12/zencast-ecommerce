const express = require('express');
const router = express.Router();
const multer = require('multer');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });
const { restrict, checkAccess } = require('../../lib/auth');
const adminCtrl = require('../../controllers/admin.controller');
const adminViews = require('../../controllers/admin.views');
const settingsCtrl = require('../../controllers/settings.controller');

// Admin section
router.get('/admin', restrict, (req, res, next) => {
	res.redirect('/admin/dashboard');
});

// logout
router.get('/admin/logout', adminViews.logout);

// Used for tests only
if (process.env.NODE_ENV === 'test') {
	router.get('/admin/csrf', csrfProtection, (req, res, next) => {
		res.json({
			csrf: req.csrfToken(),
		});
	});
}

// login form
router.get('/admin/login', adminViews.login);

// login the user and check the password
router.post('/admin/login_action', adminCtrl.login);

// setup form is shown when there are no users setup in the DB
router.get('/admin/setup', adminViews.setup);

// insert a user
router.post('/admin/setup_action', adminCtrl.setup);

// dashboard
router.get('/admin/dashboard', csrfProtection, restrict, adminViews.dashboard);

//-------------------------------SETTINGS------------------------------------

router.use('/admin/settings', require('./settings'));

// upload the file
const upload = multer({ dest: 'public/uploads/' });
router.post(
	'/admin/file/upload',
	restrict,
	checkAccess,
	upload.single('uploadFile'),
	settingsCtrl.fileUpload
);

// validate the permalink
router.post('/admin/validatePermalink', settingsCtrl.validatePermalink);

// create API key
router.post('/admin/createApiKey', restrict, checkAccess, settingsCtrl.apiKey);

// delete a file via ajax request
router.post('/admin/testEmail', restrict, settingsCtrl.testEmail);

router.post('/admin/searchall', restrict, settingsCtrl.searchAll);

//--------------------------------------PRODUCTS----------------------------------

router.use('/admin/product', require('./products'));

//------------------------------- USERS ------------------------------------
router.use('/admin/user', require('./users'));

//------------------------------- CUSTOMER ------------------------------------

router.use('/admin/customer', require('./customers'));

//------------------------------- ORDER ------------------------------------
router.use('/admin/order', require('./orders'));

//------------------------------- REVIEWS ------------------------------------
router.use('/admin/review', require('./reviews'));

module.exports = router;

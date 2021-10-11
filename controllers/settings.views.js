const escape = require('html-entities').AllHtmlEntities;
const { clearSessionValue, getThemes, getId } = require('../lib/common');
const { sortMenu, getMenu } = require('../lib/menu');
const { PagesRepo, DiscountRepo } = require('../repositories');

const settingsViews = {
	settings: (req, res) => {
		res.render('settings', {
			title: 'Cart settings',
			session: req.session,
			admin: true,
			themes: getThemes(),
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			footerHtml:
				typeof req.app.config.footerHtml !== 'undefined'
					? escape.decode(req.app.config.footerHtml)
					: null,
			googleAnalytics:
				typeof req.app.config.googleAnalytics !== 'undefined'
					? escape.decode(req.app.config.googleAnalytics)
					: null,
			csrfToken: req.csrfToken(),
		});
	},
	menuSettings: async (req, res) => {
		const db = req.app.db;
		res.render('settings-menu', {
			title: 'Cart menu',
			session: req.session,
			admin: true,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			menu: sortMenu(await getMenu(db)),
			csrfToken: req.csrfToken(),
		});
	},
	pagesSettings: async (req, res) => {
		const db = req.app.db;
		const pages = await PagesRepo.findMany({});

		res.render('settings-pages', {
			title: 'Static pages',
			pages: pages,
			session: req.session,
			admin: true,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			menu: sortMenu(await getMenu(db)),
			csrfToken: req.csrfToken(),
		});
	},

	newPages: async (req, res) => {
		const db = req.app.db;

		res.render('settings-page', {
			title: 'Static pages',
			session: req.session,
			admin: true,
			button_text: 'Create',
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			menu: sortMenu(await getMenu(db)),
			csrfToken: req.csrfToken(),
		});
	},

	editPages: async (req, res) => {
		const db = req.app.db;
		const page = await PagesRepo.findOne({ _id: getId(req.params.page) });
		const menu = sortMenu(await getMenu(db));
		if (!page) {
			res.status(404).render('error', {
				title: '404 Error - Page not found',
				config: req.app.config,
				message: '404 Error - Page not found',
				helpers: req.handlebars.helpers,
				showFooter: 'showFooter',
				menu,
			});
			return;
		}

		res.render('settings-page', {
			title: 'Static pages',
			page: page,
			button_text: 'Update',
			session: req.session,
			admin: true,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			menu,
			csrfToken: req.csrfToken(),
		});
	},
	discounts: async (req, res) => {
		const discounts = await DiscountRepo.findMany({});

		res.render('settings-discounts', {
			title: 'Discount code',
			config: req.app.config,
			session: req.session,
			discounts,
			admin: true,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			csrfToken: req.csrfToken(),
		});
	},
	editDiscount: async (req, res) => {
		const discount = await DiscountRepo.findOne({ _id: getId(req.params.id) });

		res.render('settings-discount-edit', {
			title: 'Discount code edit',
			session: req.session,
			admin: true,
			discount,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			csrfToken: req.csrfToken(),
		});
	},
	newDiscount: async (req, res) => {
		res.render('settings-discount-new', {
			title: 'Discount code create',
			session: req.session,
			admin: true,
			message: clearSessionValue(req.session, 'message'),
			messageType: clearSessionValue(req.session, 'messageType'),
			helpers: req.handlebars.helpers,
			config: req.app.config,
			csrfToken: req.csrfToken(),
		});
	},
};

module.exports = settingsViews;

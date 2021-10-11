const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.orders;

const newOrderRepo = {
	...baseRepository(collection),
	amount: async () =>
		await collection
			.aggregate([{ $match: {} }, { $group: { _id: null, sum: { $sum: '$orderTotal' } } }])
			.toArray(),
	sold: async () =>
		await collection
			.aggregate([
				{ $match: {} },
				{ $group: { _id: null, sum: { $sum: '$orderProductCount' } } },
			])
			.toArray(),
	top: async () =>
		await collection
			.aggregate([
				{ $project: { _id: 0 } },
				{ $project: { o: { $objectToArray: '$orderProducts' } } },
				{ $unwind: '$o' },
				{
					$group: {
						_id: '$o.v.title',
						productImage: { $last: '$o.v.productImage' },
						count: { $sum: '$o.v.quantity' },
					},
				},
				{ $sort: { count: -1 } },
				{ $limit: 5 },
			])
			.toArray(),
};

module.exports = newOrderRepo;

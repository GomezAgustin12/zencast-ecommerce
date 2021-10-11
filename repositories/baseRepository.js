const colors = require('colors');
const { validateJson } = require('../lib/schema');

const baseRepository = (collection) => ({
	validateSchema: (schema, object) => {
		const schemaValidate = validateJson(schema, object);
		if (!schemaValidate.result) {
			if (process.env.NODE_ENV !== 'test') {
				console.log('schemaValidate errors', schemaValidate.errors);
			}
			throw Error(schemaValidate.errors);
		}
	},
	findOne: async (query) => {
		try {
			return await collection.findOne(query);
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
	findMany: async ({
		query = {},
		projection = {},
		sort = {},
		limit = Number.MAX_SAFE_INTEGER,
	}) => {
		try {
			const res = await collection.find(query, projection).sort(sort).limit(limit).toArray();
			return res;
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
	create: async (values) => {
		try {
			return await collection.insertOne(values);
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
	updateOne: async ({ query = {}, set = {}, options = {} }) => {
		try {
			return await collection.findOneAndUpdate(
				query,
				{
					$set: set,
				},
				{ multi: false, returnOriginal: false, ...options }
			);
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
	delete: async (id) => {
		try {
			return await collection.deleteOne({ _id: id });
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
	countDocuments: async (query) => {
		try {
			return await collection.countDocuments(query);
		} catch (error) {
			console.error('🔥🔥', colors.red(error));
			throw Error(error);
		}
	},
});

module.exports = baseRepository;

const baseRepository = require('./baseRepository');
const { getDb } = require('../lib/db');

const db = getDb();
const collection = db.customers;

const CustomerRepo = {
   ...baseRepository(collection),
   checkCustomerExistById: async (_id) => {
      // check for existing customer
      const customer = await collection.findOne({ _id });
      if (!customer) throw Error('Customer not found');
   },
};

module.exports = CustomerRepo;

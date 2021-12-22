const { serial: test } = require('ava');
const { runBefore, g } = require('../helper');
const baseRepository = require('../../repositories/baseRepository');

test.before(async () => {
   await runBefore();
});

const collection = g.db.product;

const ProductRepo = {
   ...baseRepository(collection),
};

//I tested the base repository through the product repository

test('[Success] Validate schema', async (t) => {
   const doc = {
      productPermalink: 'ayres-chambray',
      productTitle: 'Ayres Chambray',
      productPrice: '77.99',
      productDescription:
         'Comfortable and practical, our chambray button down is perfect for travel or days spent on the go. The Ayres Chambray has a rich, washed out indigo color suitable to throw on for any event. Made with sustainable soft chambray featuring two chest pockets with sturdy and scratch resistant corozo buttons.<ul><li>100% Organic Cotton Chambray, 4.9 oz Fabric.</li><li>Natural Corozo Buttons.</li></ul>',
      productGtin: '7777777777',
      productBrand: 'Ayres',
      productPublished: true,
      productTags: 'shirt',
      productStock: 10,
   };
   try {
      await ProductRepo.validateSchema('newProduct', doc);
      t.pass();
   } catch {
      t.fail();
   }
});

test('[Fail] Validate schema, given a not valid schema', async (t) => {
   //GTIN should be a numeric string
   const doc = {
      productPermalink: 'ayres-chambray',
      productTitle: 'Ayres Chambray',
      productPrice: '77.99',
      productDescription:
         'Comfortable and practical, our chambray button down is perfect for travel or days spent on the go. The Ayres Chambray has a rich, washed out indigo color suitable to throw on for any event. Made with sustainable soft chambray featuring two chest pockets with sturdy and scratch resistant corozo buttons.<ul><li>100% Organic Cotton Chambray, 4.9 oz Fabric.</li><li>Natural Corozo Buttons.</li></ul>',
      productGtin: '7777777777a',
      productBrand: 'Ayres',
      productPublished: true,
      productTags: 'shirt',
      productStock: 10,
   };
   try {
      await ProductRepo.validateSchema('newProduct', doc);
      t.fail();
   } catch (error) {
      t.deepEqual(
         error.message,
         '/productGtin: should match format "alphanumeric"'
      );
   }
});

const { serial: test } = require('ava');
const { runBefore, g } = require('../helper');

test.before(async () => {
   await runBefore();
});

test('[Success] Add discount code on checkout', async (t) => {
   await g.request
      .post('/product/addtocart')
      .send({
         productId: g.products[0]._id,
         productQuantity: 1,
      })
      .expect(200);
   const res = await g.request
      .post('/checkout/adddiscountcode')
      .send({ discountCode: g.discounts[0].code })
      .expect(200);

   t.deepEqual(res.body.message, 'Discount code applied');
});

test('[Success] Check cart Data', async (t) => {
   const res = await g.request.get('/checkout/cartData').expect(200);
   t.pass(res);
});

test('[Success] Remove discount code', async (t) => {
   await g.request
      .post('/product/addtocart')
      .send({
         productId: g.products[0]._id,
         productQuantity: 1,
      })
      .expect(200);
   await g.request
      .post('/checkout/adddiscountcode')
      .send({ discountCode: g.discounts[0].code })
      .expect(200);
   const res = await g.request.post('/checkout/removediscountcode').expect(200);
   t.deepEqual(res.body.message, 'Discount code removed');
});

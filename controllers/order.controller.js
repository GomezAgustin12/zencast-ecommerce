const {
   getId,
   sendEmail,
   getEmailTemplate,
   clearCustomer,
} = require('../lib/common');
const { emptyCart } = require('../lib/cart');
const { indexOrders } = require('../lib/indexing');
const OrdersRepo = require('../repositories/orders.repositories');
const colors = require('colors');

const orderCtrl = {
   create: async (req, res) => {
      try {
         const config = req.app.config;

         // Check if cart is empty
         if (!req.session.cart) {
            res.status(400).json({
               message:
                  'The cart is empty. You will need to add items to the cart first.',
            });
         }

         const orderDoc = {
            orderPaymentId: getId(),
            orderPaymentGateway: 'Instore',
            orderPaymentMessage: 'Your payment was successfully completed',
            orderTotal: req.session.totalCartAmount,
            orderShipping: req.session.totalCartShipping,
            orderItemCount: req.session.totalCartItems,
            orderProductCount: req.session.totalCartProducts,
            orderCustomer: getId(req.session.customerId),
            orderEmail: req.body.email || req.session.customerEmail,
            orderCompany: req.body.company || req.session.customerCompany,
            orderFirstname: req.body.firstName || req.session.customerFirstname,
            orderLastname: req.body.lastName || req.session.customerLastname,
            orderAddr1: req.body.address1 || req.session.customerAddress1,
            orderAddr2: req.body.address2 || req.session.customerAddress2,
            orderCountry: req.body.country || req.session.customerCountry,
            orderState: req.body.state || req.session.customerState,
            orderPostcode: req.body.postcode || req.session.customerPostcode,
            orderPhoneNumber: req.body.phone || req.session.customerPhone,
            orderComment: req.body.orderComment || req.session.orderComment,
            orderStatus: req.body.orderStatus,
            orderTrackingNumber: null,
            trackingCompany: null,
            trackingURL: null,
            orderDate: new Date(),
            orderProducts: req.session.cart,
            orderType: 'Single',
         };

         // insert order into DB
         const newDoc = await OrdersRepo.create(orderDoc);

         // get the new ID
         const orderId = newDoc.insertedId;

         // add to lunr index
         indexOrders(req.app).then(() => {
            // set the results
            req.session.messageType = 'success';
            req.session.message =
               'Your order was successfully placed. Payment for your order will be completed instore.';
            req.session.paymentEmailAddr = newDoc.ops[0].orderEmail;
            req.session.paymentApproved = true;
            req.session.paymentDetails = `<p><strong>Order ID: </strong>${orderId}</p>
                <p><strong>Transaction ID: </strong>${orderDoc.orderPaymentId}</p>`;

            // set payment results for email
            const paymentResults = {
               message: req.session.message,
               messageType: req.session.messageType,
               paymentEmailAddr: req.session.paymentEmailAddr,
               paymentApproved: true,
               paymentDetails: req.session.paymentDetails,
            };

            // clear the cart
            if (req.session.cart) {
               emptyCart(req, res, 'function');
            }

            // Clear customer session
            clearCustomer(req);

            // send the email with the response
            // TODO: Should fix this to properly handle result
            sendEmail(
               req.session.paymentEmailAddr,
               `Your order with ${config.cartTitle}`,
               getEmailTemplate(paymentResults)
            );

            // redirect to outcome
            res.status(200).json({
               message: 'Order created successfully',
               orderId,
            });
         });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         res.status(400).json({
            err: 'Your order declined. Please try again',
         });
      }
   },
   delete: async (req, res) => {
      // remove the order
      try {
         await OrdersRepo.delete(getId(req.params.id));

         // remove the index
         indexOrders(req.app).then(() => {
            if (req.apiAuthenticated) {
               res.status(200).json({
                  message: 'Order successfully deleted',
               });
               return;
            }

            // redirect home
            req.session.message = 'Order successfully deleted';
            req.session.messageType = 'success';
            res.redirect('/admin/order');
         });
      } catch (error) {
         console.error('Cannot delete order', colors.red(error));
         if (req.apiAuthenticated) {
            res.status(200).json({
               message: 'Error deleting order',
            });
            return;
         }

         // redirect home
         req.session.message = 'Error deleting order';
         req.session.messageType = 'danger';
         res.redirect('/admin/order');
      }
   },
   updateStatus: async (req, res) => {
      try {
         await OrdersRepo.updateOne({
            query: { _id: getId(req.body.order_id) },
            set: { orderStatus: req.body.status },
         });
         return res
            .status(200)
            .json({ message: 'Status successfully updated' });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         return res
            .status(400)
            .json({ message: 'Failed to update the order status' });
      }
   },
   setTrackingNumber: async (req, res) => {
      try {
         OrdersRepo.validateSchema('newTrackingNumber', req.body);

         await OrdersRepo.updateOne({
            query: { _id: getId(req.body.order_id) },
            set: {
               orderTrackingNumber: parseInt(req.body.orderTrackingNumber),
               trackingCompany: req.body.trackingCompany,
               trackingURL: req.body.trackingURL,
               orderStatus: 'Shipped',
            },
         });
         return res
            .status(200)
            .json({ message: 'Tracking Number successfully update' });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         return res
            .status(400)
            .json({ message: 'Failed to update the order status' });
      }
   },
};

module.exports = orderCtrl;

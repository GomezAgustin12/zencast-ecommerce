const colors = require('colors');
const randtoken = require('rand-token');
const bcrypt = require('bcryptjs');
const { getId, mongoSanitize, sendEmail } = require('../lib/common');
const { indexCustomers } = require('../lib/indexing');
const CustomerRepo = require('../repositories/customer.repositories');

//Uncomment just for testing and use an id from the database from customers collection

const filledCustomerObject = (req) => ({
   email: req.body.email,
   firstName: req.body.firstName,
   lastName: req.body.lastName,
   address1: req.body.address1,
   address2: req.body.address2,
   country: req.body.country,
   state: req.body.state,
   postcode: req.body.postcode,
   phone: req.body.phone,
   company: req.body.company,
});

const setCustomersInSession = (session, obj) => {
   session.customerEmail = obj.email;
   session.customerCompany = obj.company;
   session.customerFirstname = obj.firstName;
   session.customerLastname = obj.lastName;
   session.customerAddress1 = obj.address1;
   session.customerAddress2 = obj.address2;
   session.customerCountry = obj.country;
   session.customerState = obj.state;
   session.customerPostcode = obj.postcode;
   session.customerPhone = obj.phone;
};

const customerCtrl = {
   create: async (req, res) => {
      try {
         const customerObj = {
            ...filledCustomerObject(req),
            password: bcrypt.hashSync(req.body.password, 10),
            created: new Date(),
         };

         CustomerRepo.validateSchema('newCustomer', customerObj);

         // check for existing customer
         const customer = await CustomerRepo.findOne({
            email: customerObj.email,
         });
         if (customer)
            throw Error('A customer already exists with that email address');

         // email is ok to be used.
         const newCustomer = await CustomerRepo.create(customerObj);
         indexCustomers(req.app).then(() => {
            // Return the new customer
            const customerReturn = newCustomer.ops[0];
            delete customerReturn.password;

            // Set the customer into the session
            req.session.customerPresent = true;
            req.session.customerId = customerReturn._id;
            setCustomersInSession(req, customerReturn);
            req.session.orderComment = req.body.orderComment;

            // Return customer oject
            res.status(200).json(customerReturn);
         });
      } catch (error) {
         console.error(
            colors.red('🔥🔥', 'Failed to insert customer: ', error)
         );
         res.status(400).json({
            message: `Failed to insert customer: ${error.message}`,
         });
      }
   },
   save: async (req, res) => {
      try {
         const customerObj = filledCustomerObject(req);

         CustomerRepo.validateSchema('saveCustomer', customerObj);

         // Set the customer into the session
         req.session.customerPresent = true;
         setCustomersInSession(req.session, customerObj);
         req.session.orderComment = req.body.orderComment;

         res.status(200).json(customerObj);
      } catch (error) {
         console.error(colors.red('Failed to insert customer: ', error));
         res.status(400).json({ message: error.message });
      }
   },
   update: async function (req, res) {
      try {
         const customerObj = filledCustomerObject(req);

         CustomerRepo.validateSchema('editCustomer', customerObj);
         await CustomerRepo.checkCustomerExistById(getId(req.session.id));

         // Update customer
         const updatedCustomer = await CustomerRepo.updateOne({
            query: { _id: getId(req.session.id) },
            set: customerObj,
         });
         indexCustomers(req.app).then(() => {
            // Set the customer into the session
            setCustomersInSession(req, customerObj);
            req.session.orderComment = req.body.orderComment;

            res.status(200).json({
               message: 'Customer updated',
               customer: updatedCustomer.value,
            });
         });
      } catch (error) {
         console.error(
            '🔥🔥',
            colors.red(`Failed updating customer: ${error} \n ${error.stack}`)
         );
         res.status(400).json({
            message: `Failed to update customer: ${error.message}`,
         });
      }
   },
   updateFromAdmin: async (req, res) => {
      try {
         const customerObj = filledCustomerObject(req);

         // Handle optional values
         if (req.body.password) {
            customerObj.password = bcrypt.hashSync(req.body.password, 10);
         }

         CustomerRepo.validateSchema('editCustomer', customerObj);

         const customer = await CustomerRepo.findOne({
            email: req.body.email,
         });
         if (!customer) throw Error('Customer not found');

         // Update customer
         const updatedCustomer = await CustomerRepo.updateOne({
            query: { email: req.body.email },
            set: customerObj,
         });

         indexCustomers(req.app).then(() => {
            const returnCustomer = updatedCustomer.value;
            delete returnCustomer.password;
            res.status(200).json({
               message: 'Customer updated',
               customer: updatedCustomer.value,
            });
         });
      } catch (error) {
         console.error(
            '🔥🔥',
            colors.red(`Failed updating customer: ${error} \n ${error.stack}`)
         );
         res.status(400).json({
            message: `Failed to update customer: ${error.message}`,
         });
      }
   },
   delete: async (req, res) => {
      try {
         CustomerRepo.checkCustomerExistById(getId(req.body.customerId));

         // Update customer
         await CustomerRepo.delete(getId(req.body.customerId));
         indexCustomers(req.app).then(() => {
            res.status(200).json({ message: 'Customer deleted' });
         });
      } catch (error) {
         console.error(
            '🔥🔥',
            colors.red(`Failed deleting customer: ${error}`)
         );
         res.status(400).json({
            message: `Failed deleting customer: ${error.message}`,
         });
      }
   },
   findByEmail: async (req, res) => {
      try {
         const customerEmail = req.body.customerEmail;

         // Search for a customer
         const customer = await CustomerRepo.findOne({
            email: customerEmail,
         });

         if (customer) {
            req.session.customerPresent = true;
            req.session.customerId = customer._id;
            setCustomersInSession(req, customer);

            return res
               .status(200)
               .json({ message: 'Customer found', customer });
         }
         return res.status(400).json({ message: 'No customers found' });
      } catch (error) {
         console.error('🔥🔥', colors.red(`Failed to find customer: ${error}`));
         res.status(400).json({
            message: `Failed to find customer: ${error.message}`,
         });
      }
   },
   login: async (req, res) => {
      const customer = await CustomerRepo.findOne({
         email: mongoSanitize(req.body.loginEmail),
      });
      // check if customer exists with that email
      if (customer === undefined || customer === null) {
         res.status(400).json({
            message: 'A customer with that email does not exist.',
         });
         return;
      }
      // we have a customer under that email so we compare the password
      bcrypt
         .compare(req.body.loginPassword, customer.password)
         .then((result) => {
            if (!result) {
               // password is not correct
               res.status(400).json({
                  message: 'Access denied. Check password and try again.',
               });
               return;
            }

            // Customer login successful
            req.session.customerPresent = true;
            req.session.customerId = customer._id;
            setCustomersInSession(req, customer);

            res.status(200).json({
               message: 'Successfully logged in',
               customer: customer,
            });
         })
         .catch((error) => {
            console.error('🔥🔥', colors.red(error));
            res.status(400).json({
               message: 'Access denied. Check password and try again.',
            });
         });
   },
   forgottenPassword: async (req, res) => {
      const config = req.app.config;
      const passwordToken = randtoken.generate(30);

      // find the user
      const customer = await CustomerRepo.findOne({ email: req.body.email });
      try {
         if (!customer) {
            // if don't have an email on file, silently fail
            res.status(200).json({
               message:
                  'If your account exists, a password reset has been sent to your email',
            });
            return;
         }
         const tokenExpiry = Date.now() + 3600000;
         await CustomerRepo.updateOne({
            query: { email: req.body.email },
            set: {
               resetToken: passwordToken,
               resetTokenExpiry: tokenExpiry,
            },
         });
         // send forgotten password email
         const mailOpts = {
            to: req.body.email,
            subject: 'Forgotten password request',
            body: `You are receiving this because you (or someone else) have requested the reset of the password for your user account.\n\n
					Please click on the following link, or paste this into your browser to complete the process:\n\n
					${config.baseUrl}/customer/reset/${passwordToken}\n\n
					If you did not request this, please ignore this email and your password will remain unchanged.\n`,
         };

         // send the email with token to the user
         // TODO: Should fix this to properly handle result
         sendEmail(mailOpts.to, mailOpts.subject, mailOpts.body);
         res.status(200).json({
            message:
               'If your account exists, a password reset has been sent to your email',
         });
      } catch (error) {
         console.error('🔥🔥', colors.red(error));
         res.status(400).json({
            message: 'Password reset failed.',
         });
      }
   },
   resetPassword: async (req, res) => {
      // get the customer
      const customer = await CustomerRepo.findOne({
         resetToken: req.params.token,
         resetTokenExpiry: { $gt: Date.now() },
      });
      if (!customer) {
         req.session.message = 'Password reset token is invalid or has expired';
         req.session.message_type = 'danger';
         return res.redirect('/forgot');
      }

      // update the password and remove the token
      const newPassword = bcrypt.hashSync(req.body.password, 10);
      try {
         await CustomerRepo.updateOne({
            query: { email: customer.email },
            set: {
               password: newPassword,
               resetToken: undefined,
               resetTokenExpiry: undefined,
            },
         });
         const mailOpts = {
            to: customer.email,
            subject: 'Password successfully reset',
            body: `This is a confirmation that the password for your account ${customer.email} has just been changed successfully.\n`,
         };

         // TODO: Should fix this to properly handle result
         sendEmail(mailOpts.to, mailOpts.subject, mailOpts.body);
         req.session.message = 'Password successfully updated';
         req.session.message_type = 'success';
         return res.redirect('/checkout/payment');
      } catch (ex) {
         console.log('Unable to reset password', ex);
         req.session.message = 'Unable to reset password';
         req.session.message_type = 'danger';
         return res.redirect('/forgot');
      }
   },
   checkIfCustomerIslogout: (req, res) => {
      if (!req.session.customerPresent) {
         return res.status(400).json({
            message: 'Not logged in',
         });
      }
      return res.status(200).json({
         message: 'Customer logged in',
      });
   },
};

module.exports = customerCtrl;

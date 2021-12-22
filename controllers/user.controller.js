const colors = require('colors');
const bcrypt = require('bcryptjs');
const { getId } = require('../lib/common');

const { UserRepo } = require('../repositories');

const userCtrl = {
   delete: async (req, res) => {
      // userId
      if (req.session.isAdmin !== true) {
         res.status(400).json({ message: 'Access denied' });
         return;
      }

      // Cannot delete your own account
      if (req.session.userId === req.body.userId) {
         res.status(400).json({
            message: 'Unable to delete own user account',
         });
         return;
      }

      const user = await UserRepo.findOne({ _id: getId(req.body.userId) });

      // If user is not found
      if (!user) {
         res.status(400).json({ message: 'User not found.' });
         return;
      }

      // Cannot delete the original user/owner
      if (user.isOwner) {
         res.status(400).json({ message: 'Access denied.' });
         return;
      }

      try {
         await UserRepo.delete(getId(req.body.userId));
         res.status(200).json({ message: 'User deleted.' });
         return;
      } catch (ex) {
         console.log('Failed to delete user', ex);
         res.status(200).json({ message: 'Cannot delete user' });
      }
   },
   update: async (req, res) => {
      let isAdmin = req.body.userAdmin === 'on';

      // get the user we want to update
      const user = await UserRepo.findOne({ _id: getId(req.body.userId) });

      // If user not found
      if (!user) {
         res.status(400).json({ message: 'User not found' });
         return;
      }

      // If the current user changing own account ensure isAdmin retains existing
      if (user.userEmail === req.session.user) {
         isAdmin = user.isAdmin;
      }

      // if the user we want to edit is not the current logged in user and the current user is not
      // an admin we render an access denied message
      if (
         user.userEmail !== req.session.user &&
         req.session.isAdmin === false
      ) {
         res.status(400).json({ message: 'Access denied' });
         return;
      }

      // create the update doc
      const updateDoc = {};
      updateDoc.isAdmin = isAdmin;
      if (req.body.usersName) {
         updateDoc.usersName = req.body.usersName;
      }
      if (req.body.userEmail) {
         updateDoc.userEmail = req.body.userEmail;
      }
      if (req.body.userPassword) {
         updateDoc.userPassword = bcrypt.hashSync(req.body.userPassword);
      }

      // Validate update user
      UserRepo.validateSchema('editUser', updateDoc);

      try {
         const updatedUser = await UserRepo.updateOne({
            query: { _id: getId(req.body.userId) },
            set: updateDoc,
         });

         const returnUser = updatedUser.value;
         delete returnUser.userPassword;
         delete returnUser.apiKey;
         res.status(200).json({
            message: 'User account updated',
            user: updatedUser.value,
         });
         return;
      } catch (ex) {
         console.error(colors.red(`Failed updating user: ${ex}`));
         res.status(400).json({ message: 'Failed to update user' });
      }
   },
   create: async (req, res) => {
      // Check number of users
      const userCount = await UserRepo.countDocuments({});
      let isAdmin = false;

      // if no users, setup user as admin
      if (userCount === 0) {
         isAdmin = true;
      }

      const userObj = {
         usersName: req.body.usersName,
         userEmail: req.body.userEmail,
         userPassword: bcrypt.hashSync(req.body.userPassword, 10),
         isAdmin: isAdmin,
      };

      // Validate new user
      UserRepo.validateSchema('newUser', userObj);

      // check for existing user
      const user = await UserRepo.findOne({ userEmail: req.body.userEmail });
      if (user) {
         console.error(
            '🔥🔥',
            colors.red('Failed to insert user, possibly already exists')
         );
         res.status(400).json({
            message: 'A user with that email address already exists',
         });
         return;
      }
      // email is ok to be used.
      try {
         const newUser = await UserRepo.create(userObj);
         res.status(200).json({
            message: 'User account inserted',
            userId: newUser.insertedId,
         });
      } catch (error) {
         console.error('🔥🔥', colors.red(`Failed to insert user: ${error}`));
         res.status(400).json({ message: 'New user creation failed' });
      }
   },
};

module.exports = userCtrl;

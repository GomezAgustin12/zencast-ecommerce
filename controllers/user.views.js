const { getId, clearSessionValue } = require("../lib/common");
const { UserRepo } = require("../repositories");

const userViews = {
  list: async (req, res) => {
    const users = await UserRepo.findMany({ projection: { userPassword: 0 } });

    if (req.apiAuthenticated) {
      res.status(200).json(users);
      return;
    }

    res.render("users", {
      title: "Users",
      users: users,
      admin: true,
      config: req.app.config,
      isAdmin: req.session.isAdmin,
      helpers: req.handlebars.helpers,
      session: req.session,
      message: clearSessionValue(req.session, "message"),
      messageType: clearSessionValue(req.session, "messageType"),
    });
  },
  editUser: async (req, res) => {
    const user = await UserRepo.findOne({ _id: getId(req.params.id) });

    // Check user is found
    if (!user) {
      if (req.apiAuthenticated) {
        res.status(400).json({ message: "User not found" });
        return;
      }

      req.session.message = "User not found";
      req.session.messageType = "danger";
      res.redirect("/admin/user");
      return;
    }

    // if the user we want to edit is not the current logged in user and the current user is not
    // an admin we render an access denied message
    if (user.userEmail !== req.session.user && req.session.isAdmin === false) {
      if (req.apiAuthenticated) {
        res.status(400).json({ message: "Access denied" });
        return;
      }

      req.session.message = "Access denied";
      req.session.messageType = "danger";
      res.redirect("/admin/user");
      return;
    }

    res.render("user-edit", {
      title: "User edit",
      user: user,
      admin: true,
      session: req.session,
      message: clearSessionValue(req.session, "message"),
      messageType: clearSessionValue(req.session, "messageType"),
      helpers: req.handlebars.helpers,
      config: req.app.config,
    });
  },
  newUser: (req, res) => {
    res.render("user-new", {
      title: "User - New",
      admin: true,
      session: req.session,
      helpers: req.handlebars.helpers,
      message: clearSessionValue(req.session, "message"),
      messageType: clearSessionValue(req.session, "messageType"),
      config: req.app.config,
    });
  },
};
module.exports = userViews;

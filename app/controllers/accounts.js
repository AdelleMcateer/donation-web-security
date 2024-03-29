"use strict";
const User = require("../models/user");
const Boom = require("@hapi/boom");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");          // ADDED
const saltRounds = 10;                     // ADDED
const Crypto=require("crypto-js");         // ADDED
const CryptoSecretKey = process.env.CRYPTO_SECRET_KEY;   // ADDED

const Accounts = {
  index: {
    auth: false,
    handler: function (request, h) {
      if (request.auth.isAuthenticated) {
        request.cookieAuth.set(request.auth.credentials);
        return ('Hello ' + request.auth.credentials.profile.displayName);
      }
      else {
      return('Not logged in...');
    }
      return h.view("main", { title: "Welcome to Donations" });
    },
  },
  showSignup: {
    auth: false,
    handler: function (request, h) {
      return h.view("signup", { title: "Sign up for Donations" });
    },
  },
  signup: {
    auth: false,
    validate: {
      payload: {
        // begin with upper case letter and then 2+ alphanumeric lower case letters
        firstName: Joi.string().alphanum().regex(/^[A-Z]/).min(3).max(15).required(),

        //begin with upper case letter, then any 2+ alphanumeric characters
        lastName: Joi.string().alphanum().regex(/[A-Z]/).min(3).max(15).required(),
        email: Joi.string().max(30).email().required(),
        password: Joi.string().required().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,30}$/),
      },
      options: {
        abortEarly: false,
      },
      failAction: function (request, h, error) {
        return h
          .view("signup", {
            title: "Sign up error",
            errors: error.details,
          })
          .takeover()
          .code(400);
      },
    },
    handler: async function (request, h) {
      try {
        const payload = request.payload;
        let user = await User.findByEmail(payload.email);
        if (user) {
          const message = "Email address is already registered";
          throw Boom.badData(message);
        }

        const hash = await bcrypt.hash(payload.password, saltRounds);    // ADDED

        const newUser = new User({
          firstName: Crypto.AES.encrypt(payload.firstName, CryptoSecretKey),
          lastName: Crypto.AES.encrypt(payload.lastName, CryptoSecretKey),
          //firstName: payload.firstName,
          //lastName: payload.lastName,
          email: payload.email,
          password: hash                             // EDITED
        });
        user = await newUser.save();
        request.cookieAuth.set({ id: user.id });
        return h.redirect("/home");
      } catch (err) {
        return h.view("signup", { errors: [{ message: err.message }] });
      }
    },
  },
  showLogin: {
    auth: false,
    handler: function (request, h) {
      return h.view("login", { title: "Login to Donations" });
    },
  },
  login: {
    auth: 'github-oauth',
    validate: {
      payload: {
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      },
      options: {
        abortEarly: false,
      },
      failAction: function (request, h, error) {
        return h
          .view("login", {
            title: "Sign in error",
            errors: error.details,
          })
          .takeover()
          .code(400);
      },
    },
    handler: async function (request, h) {

      const { email, password } = request.payload;
      try {
        let user = await User.findByEmail(email);
        if (!user) {
          const message = "Email address is not registered";
          throw Boom.unauthorized(message);
        }
        //user.comparePassword(password);
        await user.comparePassword(password);           // EDITED
        request.cookieAuth.set({ id: user.id });
        return h.redirect("/home");
      } catch (err) {
        return h.view("login", { errors: [{ message: err.message }] });
      }
    },
  },
  logout: {
    handler: function (request, h) {
      request.cookieAuth.clear();
      return h.redirect("/");
    },
  },
  showSettings: {
    handler: async function (request, h) {
      try {
        const id = request.auth.credentials.id;
        const user = await User.findById(id).lean();
        return h.view("settings", { title: "Donation Settings", user: user });
      } catch (err) {
        return h.view("login", { errors: [{ message: err.message }] });
      }
    },
  },
  updateSettings: {
    validate: {
      payload: {
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      },
      options: {
        abortEarly: false,
      },
      failAction: function (request, h, error) {
        return h
          .view("settings", {
            title: "Sign up error",
            errors: error.details,
          })
          .takeover()
          .code(400);
      },
    },
    handler: async function (request, h) {
      try {
        const userEdit = request.payload;
        const id = request.auth.credentials.id;
        const user = await User.findById(id);
        user.firstName = Crypto.AES.encrypt(userEdit.firstName, CryptoSecretKey);
        user.lastName = Crypto.AES.encrypt(userEdit.lastName, CryptoSecretKey);
        //user.firstName = userEdit.firstName;
        //user.lastName = userEdit.lastName;
        user.email = userEdit.email;
        //user.password = userEdit.password;          // EXERCISE -- change this to use bcrypt
        const hash = await bcrypt.hash(userEdit.password, saltRounds);
        user.password = hash;
        await user.save();
        return h.redirect("/settings");
      } catch (err) {
        return h.view("main", { errors: [{ message: err.message }] });
      }
    },
  },
};

module.exports = Accounts;
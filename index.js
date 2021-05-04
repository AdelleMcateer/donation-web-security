"use strict";

const os = require('os'); //Adding to implement Git oauth
os.tmpDir = os.tmpdir;

const Hapi = require("@hapi/hapi");
const Bell = require('@hapi/bell'); //Added Bell component
const Inert = require("@hapi/inert");
const Vision = require("@hapi/vision");
const Handlebars = require("handlebars");
const AuthCookie = require('@hapi/cookie'); //Added/Duplicate?
//const Cookie = require("@hapi/cookie");
const Joi = require("@hapi/joi");
require("./app/models/db");
const env = require("dotenv");

const dotenv = require("dotenv");

const result = dotenv.config();
if (result.error) {
  console.log(result.error.message);
  process.exit(1);
}

const fs = require('fs');
const server = Hapi.server({
  port: 3443,
  tls: {
    key: fs.readFileSync('keys/private/webserver.key'),
    cert: fs.readFileSync('keys/webserver.crt')
  }
});
//const server = Hapi.server({
  //port: process.env.PORT || 4000,
  //routes: { cors: true },
//});

async function init() {
  await server.register(Inert);
  await server.register(Vision);
  //await server.register(Cookie);

  // Register bell and hapi auth cookie with the server
  await server.register([Bell, AuthCookie]);

  server.validator(require("@hapi/joi"));

  server.views({
    engines: {
      hbs: require("handlebars"),
    },
    relativeTo: __dirname,
    path: "./app/views",
    layoutPath: "./app/views/layouts",
    partialsPath: "./app/views/partials",
    layout: true,
    isCached: false,
  });

  //server.auth.strategy("session", "cookie", {
  server.auth.strategy("cookie-auth", "cookie", {
    cookie: {
      //name: process.env.cookie_name,
      name: 'donation_auth',
      password: 'password-should-be-32-characters',  // String used to encrypt cookie
      //password: process.env.cookie_password,
      isSecure: false,  // Should be 'true' in production software (requires HTTPS)
    },
    redirectTo: "/",
  });

  var bellAuthOptions = {
    provider: 'github',
    password: 'github-encryption-password-secure', // String used to encrypt cookie
    // used during authorisation steps only
    clientId: '49687bb3bcffc48d4c76',          // *** Replace with your app Client Id ****
    clientSecret: 'ea4e2143609b8e0324880e9c6412a0c0ec18b9bc',  // *** Replace with your app Client Secret ***
    isSecure: false        // Should be 'true' in production software (requires HTTPS)
  };

  server.auth.strategy('github-oauth', 'bell', bellAuthOptions);

  server.auth.default('cookie-auth');

  //server.auth.default("session");
  server.route(require("./routes"));
  server.route(require("./routes-api"));
  await server.start();
  return server;
  console.log(`Server running at: ${server.info.uri}`);
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init()
.then((server) => console.log(`Server listening on ${server.info.uri}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

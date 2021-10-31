ganomede-admin
================

Administration panel for Ganomede.

# Getting started

To start the administration panel, we first need to install dependencies, then bundle the frontend app. To achieve this, run:

   make install

Next step is to run the server with

   node index.js

However, it requires a number of environment variable for configuration. See below for the list.

There is a helper script called `./run-server.dev.sh` that contains placeholder environment variable for you, feel free to modify those to your development needs.

Navigate to [http://localhost:8000](http://localhost:8000) to test. Assuming you didn't modify the `PORT` environment variable.

# Environment variables

Here's the list of environment variables used to configure the service.

## General

 - `HOST` and `PORT` for interface/port to listen on
 - `ADMIN_USERNAME` --> administrator username
 - `ADMIN_PASSWORD` --> administrator password

## Servers links

Links to dispay in a "link box" on the Servers page.

 - `SERVERS_LINK1_URL` --> link of service 1
 - `SERVERS_LINK1_NAME`--> name of service 1
 - `SERVERS_LINK2_URL` --> link of service 2
 - `SERVERS_LINK2_NAME`--> name of service 2, etc....

## Analytics links

Links to dispay in a "link box" on the Analytics page.

 - `ANALYTICS_LINK1_URL` --> link of analytics service 1
 - `ANALYTICS_LINK1_NAME`--> name of analytics service 1
 - `ANALYTICS_LINK2_URL` --> link of analytics service 2
 - `ANALYTICS_LINK2_NAME`--> name of analytics service 2, etc....

## Other microservices

Most of functionality depends on interacting with other ganomede
microservices. Provide links to them with env vars (otherwise, related functionality won't be available):

 - [virtual currency module](https://github.com/j3k0/ganomede-virtualcurrency)
   - `VIRTUAL_CURRENCY_PORT_8080_TCP_PROTOCOL` virtual currency protocol (`http` or `https`, defaults to `http`);
   - `VIRTUAL_CURRENCY_PORT_8080_TCP_ADDR` virtual currecny host;
   - `VIRTUAL_CURRENCY_PORT_8080_TCP_PORT` virtual currency port;
   - `VIRTUAL_CURRENCY_CURRENCY_CODES` comma-separated list of allowed currency codes for item purchases (e.g.: `gold,silver,copper`);

- [users module](https://github.com/j3k0/ganomede-users)
   - `USERS_PORT_8080_TCP_PROTOCOL` users protocol (`http` or `https`, defaults to `http`);
   - `USERS_PORT_8080_TCP_ADDR` users host;
   - `USERS_PORT_8080_TCP_PORT` users port;

- [avatars module](https://github.com/j3k0/ganomede-avatars)
   - `AVATARS_PORT_8080_TCP_PROTOCOL` avatars protocol (`http` or `https`, defaults to `http`);
   - `AVATARS_PORT_8080_TCP_ADDR` avatars host;
   - `AVATARS_PORT_8080_TCP_PORT` avatars port;

- [data module](https://github.com/j3k0/ganomede-data)
   - `DATA_PORT_8080_TCP_PROTOCOL` data protocol (`http` or `https`, defaults to `http`);
   - `DATA_PORT_8080_TCP_ADDR` data host;
   - `DATA_PORT_8080_TCP_PORT` data port;

- [directory module](https://github.com/j3k0/ganomede-directory)
   - `DIRECTORY_PORT_8000_TCP_PROTOCOL` directory protocol (`http` or `https`, defaults to `http`);
   - `DIRECTORY_PORT_8000_TCP_ADDR` directory host;
   - `DIRECTORY_PORT_8000_TCP_PORT` directory port;

# Running unit tests

Test can be run using `npm test`. Notice that test coverage is minimal at that point.

You can launch the tests in "watch" mode, with `npm run testw`. With this on, tests are ran automatically when a change is made to the code.

# Making changes

There are 2 cases:

## Changes to the frontend

After a change to the frontend, it will be necessary to recreate the bundle with:

   make -C web

If you know you'll be iterating, you can launch the bundler in "watch" mode (meaning it will automaticall rebuild when it detects a change). For this run:

   make -C web watch

## Changes to the backend

When changing the backend, you'll have to restart the server with:

   node index.js

As with the frontend, there way to have this done automatically for you:

   npx nodemon --inspect -w config.js -w index.js -w server/ -w config.js index.js

With this command, the server will be restarted automatically after any change in the `server/` directory, `index.js` or `config.js`.

## Linting

The linting process ensures you're following the code convention and can detect some errors in the code.

It is started by running this:

   npm run lint

It's also possible to launch it in "watch" mode with:

   npm run lintw

# Integration with VS Code

I recommand the `npm` extension to run npm scripts right from VS Code. It's particularly useful with unit tests, as you will be able to run them inside a debugger, which makes it easier to pindown a bug.

Once the extension is install, open the "Run and Debug" tab. Select the "NodeJS..." launch task, then find `test`.

You can then run unit tests with `F5`.

# License

(c) 2015, Fovea

All rights reserved
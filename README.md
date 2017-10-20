ganomede-admin
================

Admin panel for Triominos


# Env variables

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

# Run

1. `make install` fetches dependencies and builds client-side JS bundle;
2. `node index.js` will run the server (`export` all the required env vars);
  - `./run-server.dev.sh` exports some placeholder env vars for you, feel free to modify those to your development needs;
3. Go to [http://localhost:8000](http://localhost:8000).

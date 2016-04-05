ganomede-admin
================

Admin panel for Triominos


# Env variables

 - `HOST` and `PORT` for interface/port to listen on
 - `ADMIN_USERNAME` --> administrator username
 - `ADMIN_PASSWORD` --> administrator password
 - `ADMIN_TOKEN` (optional) --> authentication token

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

## Database

This project use couchdb as database.

 - `COUCHDB_PORT`     --> couchdb port
 - `COUCHDB_HOST`     --> couchdb host
 - `COUCHDB_USER` 	   --> couchdb username
 - `COUCHDB_PASSWORD` --> couchdb password
 - `COUCHDB_DB`       --> couchdb database name

## Other microservices

Most of functionality depends on interacting with other ganomede
microservices. Provide links to them with env vars (otherwise will
deafult to locally running intstance):

 - [virtual currency module](https://github.com/j3k0/ganomede-virtualcurrency)
   - `VIRTUAL_CURRENCY_PORT_8080_TCP_ADDR` virtual currecny host;
   - `VIRTUAL_CURRENCY_PORT_8080_TCP_PORT` virtual currency port;
   - `VIRTUAL_CURRENCY_CURRENCY_CODES` comma-separated list of allowed currency codes for item purchases (e.g.: `gold,silver,copper`).

# Run

1. `make install` fetches dependencies and builds client-side JS bundle;
2. `node index.js` will run the server (`export` all the required env vars);
  - `./run-server.dev.sh` exports some placeholder env vars for you, feel free to modify those to your development needs;
3. Go to [http://localhost:8000](http://localhost:8000).

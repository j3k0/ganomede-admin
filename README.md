ganomede-admin
================

Admin panel for Triominos


# Env variables

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

# Run
run make using these env variables.

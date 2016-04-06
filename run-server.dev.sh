#!/bin/bash

function main {
  # admin server config
  export API_SECRET="1"
  export PORT="1337"
  export ADMIN_USERNAME="1"
  export ADMIN_PASSWORD="1"

  # Some links
  export SERVERS_LINK1_URL="http://tst.com"
  export SERVERS_LINK1_NAME="tst"
  export ANALYTICS_LINK1_URL="http://dsdsd.com"
  export ANALYTICS_LINK1_NAME="Tessst"

  # vcurrency config
  export VIRTUAL_CURRENCY_PORT_8080_TCP_PORT='8000'
  export VIRTUAL_CURRENCY_CURRENCY_CODES="gold,silver,copper"

  # go!
  nodemon -w server/ -w config.js index.js
}

main

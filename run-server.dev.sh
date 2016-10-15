#!/bin/bash

function exportEnv {
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

  # avatars
  export AVATARS_PORT_8080_TCP_PROTOCOL='https'
  export AVATARS_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export AVATARS_PORT_8080_TCP_PORT='443'

  # users
  export USERS_PORT_8080_TCP_PROTOCOL='https'
  export USERS_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export USERS_PORT_8080_TCP_PORT='443'
}

function main {
  exportEnv

  if [[ "_$1" = "_test" ]]; then
    echo "Runing tests…"
    npm run test
  else
    echo "Running server…"
    nodemon -w server/ -w config.js index.js
  fi
}

main $1

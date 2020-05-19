#!/bin/bash

function exportEnv {
  # admin server config
  if [ "x$API_SECRET" = "x" ]; then
    API_SECRET="1"
  fi
  export API_SECRET
  export PORT="1337"
  export ADMIN_USERNAME="1"
  export ADMIN_PASSWORD="1"

  # Some links
  export SERVERS_LINK1_URL="http://tst.com"
  export SERVERS_LINK1_NAME="tst"
  export ANALYTICS_LINK1_URL="http://dsdsd.com"
  export ANALYTICS_LINK1_NAME="Tessst"

  # vcurrency config
  export VIRTUAL_CURRENCY_PORT_8080_TCP_PROTOCOL='https'
  export VIRTUAL_CURRENCY_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export VIRTUAL_CURRENCY_PORT_8080_TCP_PORT='443'
  export VIRTUAL_CURRENCY_CURRENCY_CODES="wordsearch-gold,wordsearch-silver,wordsearch-bitmask"

  # avatars
  export AVATARS_PORT_8080_TCP_PROTOCOL='https'
  export AVATARS_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export AVATARS_PORT_8080_TCP_PORT='443'

  # users
  export USERS_PORT_8080_TCP_PROTOCOL='https'
  export USERS_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export USERS_PORT_8080_TCP_PORT='443'

  # users
  export USERMETA_PORT_8080_TCP_PROTOCOL='https'
  export USERMETA_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export USERMETA_PORT_8080_TCP_PORT='443'

  # data
  export DATA_PORT_8080_TCP_PROTOCOL='https'
  export DATA_PORT_8080_TCP_ADDR='prod.ggs.ovh'
  export DATA_PORT_8080_TCP_PORT='443'

  # directory
  export DIRECTORY_PORT_8000_TCP_PROTOCOL='https'
  export DIRECTORY_PORT_8000_TCP_ADDR='account.ggs.ovh'
  export DIRECTORY_PORT_8000_TCP_PORT='443'
}

function main {
  exportEnv

  if [[ "_$1" = "_test" ]]; then
    echo "Runing tests…"
    npm run test
  else
    echo "Running server…"
    ./node_modules/.bin/nodemon --inspect -w config.js -w index.js -w server/ -w config.js index.js
  fi
}

main $1

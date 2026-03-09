#!/bin/bash

# Run ganomede-admin in Docker, connected to the local triominos-server monolith.
# Requires: triominos-server running via docker-compose (port 38917)

docker build -t ganomede/admin:latest . || exit 1

# Stop previous instance if running
docker rm -f ganomede-admin 2>/dev/null

docker run --rm --name ganomede-admin \
  -p 1337:8000 \
  -e API_SECRET=local-dev-secret \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin \
  -e PORT=8000 \
  -e VIRTUAL_CURRENCY_CURRENCY_CODES="triominos-gold,triominos-silver,triominos-bitmask" \
  -e CHAT_ROOM_PREFIX="triominos/v1" \
  -e USERS_PORT_8080_TCP_PROTOCOL=http \
  -e USERS_PORT_8080_TCP_ADDR=host.docker.internal \
  -e USERS_PORT_8080_TCP_PORT=38917 \
  -e USERMETA_PORT_8080_TCP_PROTOCOL=http \
  -e USERMETA_PORT_8080_TCP_ADDR=host.docker.internal \
  -e USERMETA_PORT_8080_TCP_PORT=38917 \
  -e AVATARS_PORT_8080_TCP_PROTOCOL=http \
  -e AVATARS_PORT_8080_TCP_ADDR=host.docker.internal \
  -e AVATARS_PORT_8080_TCP_PORT=38917 \
  -e VIRTUAL_CURRENCY_PORT_8080_TCP_PROTOCOL=http \
  -e VIRTUAL_CURRENCY_PORT_8080_TCP_ADDR=host.docker.internal \
  -e VIRTUAL_CURRENCY_PORT_8080_TCP_PORT=38917 \
  -e DATA_PORT_8080_TCP_PROTOCOL=http \
  -e DATA_PORT_8080_TCP_ADDR=host.docker.internal \
  -e DATA_PORT_8080_TCP_PORT=38917 \
  -e DIRECTORY_PORT_8000_TCP_PROTOCOL=http \
  -e DIRECTORY_PORT_8000_TCP_ADDR=host.docker.internal \
  -e DIRECTORY_PORT_8000_TCP_PORT=38917 \
  -e CHAT_PORT_8080_TCP_PROTOCOL=http \
  -e CHAT_PORT_8080_TCP_ADDR=host.docker.internal \
  -e CHAT_PORT_8080_TCP_PORT=38917 \
  ganomede/admin:latest

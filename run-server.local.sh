#!/bin/bash

# Run ganomede-admin in Docker, connected to the local triominos-server monolith.
# Requires: triominos-server running via docker-compose (port 38917)
#
# Usage: ./run-server.local.sh [-d]
#   -d  Run in daemon (detached) mode

DOCKER_RUN_OPTS="--rm"
while getopts "d" opt; do
  case $opt in
    d) DOCKER_RUN_OPTS="--rm -d" ;;
    *) echo "Usage: $0 [-d]" >&2; exit 1 ;;
  esac
done

docker build -t ganomede/admin:latest . || exit 1

# Stop previous instance if running
docker rm -f ganomede-admin 2>/dev/null

docker run $DOCKER_RUN_OPTS --name ganomede-admin \
  -p ${PORT:-1337}:8000 \
  -e UPSTREAM_URL=http://host.docker.internal:38917 \
  -e API_SECRET=local-dev-secret \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin \
  -e CURRENCY_CODES="triominos-gold,triominos-silver,triominos-bitmask" \
  -e CHAT_ROOM_PREFIX="triominos/v1" \
  -e BRANDING_TITLE="Triominos" \
  ganomede/admin:latest

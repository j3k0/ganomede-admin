run: node_modules
	# ./node_modules/.bin/http-server web
	ADMIN_USERNAME=1 ADMIN_PASSWORD=1 node index.js

node_modules:
	npm install

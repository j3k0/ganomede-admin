run: install start

install: ;@echo "Installing....."; \
	npm install --save
start:
	ADMIN_USERNAME=1 ADMIN_PASSWORD=1 SERVERS_LINK1_URL="http://tst.com" SERVERS_LINK1_NAME="tst" ANALYTICS_LINK1_URL="http://dsdsd.com" ANALYTICS_LINK1_NAME="Tessst" node index.js

lint:
	./node_modules/.bin/eslint {index,config,utils}.js server/ web/js/

test:
	./node_modules/.bin/mocha server/**/*.test.js

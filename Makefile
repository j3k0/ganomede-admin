install:
	npm install
	make -C web

lint:
	./node_modules/.bin/eslint {index,config}.js server/ web/js/

test:
	VIRTUAL_CURRENCY_CURRENCY_CODES="gold,silver,copper" ./node_modules/.bin/mocha $(shell find ./server -name "*.test.js")

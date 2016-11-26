install:
	npm install
	make -C web

lint:
	./node_modules/.bin/eslint {index,config}.js server/ web/js/ tests/

test:
	./node_modules/.bin/mocha tests/
	VIRTUAL_CURRENCY_CURRENCY_CODES="gold,silver,copper" ./node_modules/.bin/mocha $(shell find ./server -name "*.test.js")

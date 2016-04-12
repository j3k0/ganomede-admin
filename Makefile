install:
	npm install
	make -C web

lint:
	./node_modules/.bin/eslint {index,config}.js server/ web/js/

test:
	./node_modules/.bin/mocha $(shell find ./server -name "*.test.js")

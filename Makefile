install:
	npm install
	make -C web

lint:
	./node_modules/.bin/eslint {index,config,utils}.js server/ web/js/

test:
	./node_modules/.bin/mocha server/**/*.test.js

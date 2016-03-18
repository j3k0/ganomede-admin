build:
	../node_modules/.bin/browserify \
		-t [ reactify --es6 --target es5 ] \
		-t brfs \
		js/entrypoint.js > bundle.js

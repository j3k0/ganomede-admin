FLAGS=--transform [ reactify --es6 --target es5 ] \
	--transform brfs \
	--outfile bundle.js \
	js/entrypoint.js

build:
	../node_modules/.bin/browserify ${FLAGS}

watch:
	../node_modules/.bin/watchify --debug --verbose ${FLAGS}

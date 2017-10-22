FLAGS=--transform [ babelify --presets [ es2017 react ] ] \
	--transform brfs \
	--outfile bundle.js \
	js/entrypoint.js

build:
	../node_modules/.bin/browserify ${FLAGS}

watch:
	../node_modules/.bin/watchify --debug --verbose ${FLAGS}

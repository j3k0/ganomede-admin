FROM node:5.0.0

MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>

# Create non-priviledged user
RUN useradd app -d /home/app
WORKDIR /home/app/code
RUN chown -R app /home/app
USER app

COPY package.json /home/app/code/package.json
RUN npm install

COPY Makefile README.md index.js config.js /home/app/code/

RUN mkdir /home/app/code/web
COPY web/js /home/app/code/web/js
COPY web/index.html /home/app/code/web/index.html
COPY web/libs /home/app/code/web/libs
COPY web/templates /home/app/code/web/templates

RUN (cd /home/app/code/web && \
    ../node_modules/.bin/browserify \
		-t [ reactify --es6 --target es5 ] \
		-t brfs \
		js/entrypoint.js > bundle.js)

COPY web/images /home/app/code/web/images
COPY web/img /home/app/code/web/img
COPY web/pics /home/app/code/web/pics
COPY web/css /home/app/code/web/css

COPY server /home/app/code/server

ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=admin
ENV ADMIN_TOKEN=abcd1234
ENV VIRTUAL_CURRENCY_CURRENCY_CODES=

EXPOSE 8000

CMD node index.js

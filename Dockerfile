FROM node:5.0.0

MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>

# Create non-priviledged user
RUN useradd app -d /home/app
WORKDIR /home/app/code
RUN chown -R app /home/app
USER app

COPY package.json /home/app/code/package.json
RUN npm install

COPY Makefile README.md index.js utils.js config.js /home/app/code/
COPY web /home/app/code/web

ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=admin
EXPOSE 8000

CMD node index.js

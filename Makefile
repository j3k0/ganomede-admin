install:
	npm install
	make -C web

docker:
	docker build -t ganomede/admin:latest .

run: install start
	
install: ;@echo "Installing....."; \
	npm install --save
start: 
	ADMIN_USERNAME=1 ADMIN_PASSWORD=1 SERVER_LINK1_URL="http://tst.com" SERVER_LINK1_NAME="tst" ANALYTICS_LINK1_URL="http://dsdsd.com" ANALYTICS_LINK1_NAME="Tessst" node index.js
define(function () {
  'use strict';
  var app = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;
  if (app) {
    return {
      apiUrl: "http://private-86845-elmsportstown.apiary-mock.com",
      pushApiRoot: "http://sportstown-push.fovea.cc/dev"
	};
  }
  return {
    //apiUrl: "http://private-71d0-elmsportstown.apiary-mock.com",
    //apiUrl: "http://sportstown.me/beta",
    apiUrl: "",
    pushApiRoot: "http://sportstown-push.fovea.cc/dev"
  };
});

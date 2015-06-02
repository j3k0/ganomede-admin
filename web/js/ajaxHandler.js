

define(function (/*require*/) {
    'use strict';

    var ajaxHandler = {

        codes: {
            200: "The request was successful",
            201: "The request was successful and a resource was created.",
            204: "The request was successful but there is no representation to return",
            400: "The request could not be understood or was missing required parameters.",
            401: "Authentication failed or user does not have permissions for the requested operation.",
            403: "Access denied",
            404: "Resource was not found.",
            405: "Requested method is not supported for the specified resource.",
            503: "The service is temporary unavailable"
        },

        handle: function(error, callback)
        {
            var msg = this.codes[error];
            if(!msg){
                msg = "Someting went wrong!";
            }
            console.log(msg);
            if(error === 401 || error === 403)
            {
                Backbone.history.navigate('login', {trigger: true});
                return;
            }
            
            if(callback)
            {
                callback(msg);
            }
        },

        errorFetchOrSave: function(modelOrCollection, xhr)
        {
            this.handle(xhr.status);
        },

        // options : {
        //         method: "POST",
          //         url: "",
          //        dataType: "",
          //         data: { },
          //        success: callback for success method,
          //        error: callback for error method
        // }
        
        postAjax: function(options)
        {
            var errorCallback = options.error;
            var that = this;
            options.error = function (jqXHR/*, textStatus, errorThrown*/) {
                that.handle(jqXHR.status);
                if(errorCallback)
                {
                    errorCallback();
                }
            };
            $.ajax(options);
        }
    };

    return ajaxHandler;
});


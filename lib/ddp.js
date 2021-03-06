var DDPClient = require('ddp');
var Promise = require('es6-promise').Promise;

module.exports = function makeDDPClientFactory (ddpSetupProvider) {
  "use strict";

  var self = this;
  var ddpClient = null;
  var ddpClientPromise = null;
  var code = null;
  var port = null;
  var host = null;

  return function ddpClientAsPromise () {
    
    return ddpSetupProvider().then(function (setup) {

      if (code === setup.code && port === setup.port && ddpClientPromise) {
        return ddpClientPromise;
      }

      code = setup.code;
      port = setup.port;
      host = setup.host || 'localhost';
      
      ddpClientPromise = new Promise(function (resolve, reject) {
 
        ddpClient && ddpClient.close();

        ddpClient = new DDPClient({
          host : host,
          port : port,
          path : "websocket",
          ssl  : false,
          autoReconnect : true,
          autoReconnectTimer : 500,
          maintainCollections : true,
          ddpVersion : '1'
        });

        //ddpClient.connect(function (err, wasReconnected) {
        //  if (err) {
        //    return reject(err);
        //  }
        //  resolve(ddpClient);
        //});

        var retryCount = 5;

        // XXX we need this because the WebApp.httpServer may start with some delay;
        //     in fact, this should be handled within the app itself
        (function tryConnect() {
          ddpClient.connect(function (err, wasReconnected) {
            if (err) {
              if (retryCount <= 0) {
                reject(typeof err === 'string' ? new Error(err) : err);
              } else if (!wasReconnected) {
                retryCount -= 1;
                setTimeout(tryConnect, 500);
              }
            } else {
              resolve(ddpClient);
            }
          });
        })();

        // TODO: re-enable this feature when we make timeout configurable
        //setTimeout(function () {
        //  reject(new Error('timeout while waiting to establish ddp connection'));
        //}, 2000);

        //-------------------------------------------------------------
        //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
        //-------------------------------------------------------------
      });

      return ddpClientPromise;
    });
  };

};


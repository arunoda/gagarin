
/**
 * Module dependencies.
 */

var Closure = require('./closure');
var Browser = require('./browser');
var helpers = require('./helpers');
var Meteor  = require('./meteor');
var tools   = require('./tools');
var Mocha   = require('mocha');

/**
 * Custom Mocha interface.
 */
Mocha.interfaces['gagarin'] = module.exports = function (suite) {
  "use strict";

  // TODO: allow integration with other interfaces

  // use the original bdd intrface
  Mocha.interfaces.bdd.apply(this, arguments);

  var gagarin_options  = this.options;
  var gagarin_settings = tools.getSettings(this.options.settings) || {}; // make sure it's not undefined

  suite.on('pre-require', function (context) {

    var before   = context.before;
    var after    = context.after;
    var stack    = [];

    context.expect = require('chai').expect;

    context.meteor = function (options, initialize) {

      var myHelpers = {};

      options = options || {};

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      tools.mergeHelpers(myHelpers, [ helpers.both, helpers.server ]);
      tools.mergeHelpers(myHelpers, gagarin_options.serverHelpers);

      var meteor = new Meteor({
        pathToApp    : options.pathToApp || gagarin_options.pathToApp,
        helpers      : tools.mergeHelpers(myHelpers, options.helpers),
        settings     : tools.getSettings(options.settings) || gagarin_settings,
        verbose      : gagarin_options.verbose,
        remoteServer : options.remoteServer || gagarin_options.remoteServer,
        skipBuild    : options.skipBuild || gagarin_options.skipBuild,
      });

      meteor.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return meteor.start().then(function () {
          if (typeof initialize === 'function') {
            return initialize.length ? meteor.promise(initialize) : meteor.execute(initialize);
          }
        });
      });

      after(function () {
        return meteor.stop();
      });

      return meteor;
    }

    context.browser = function (options, initialize) {

      var myHelpers = {};

      options = options || {};

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { location: options };
      }

      tools.mergeHelpers(myHelpers, [ helpers.both, helpers.client ]);
      tools.mergeHelpers(myHelpers, gagarin_options.clientHelpers);

      var browser = new Browser({
        helpers           : tools.mergeHelpers(myHelpers, options.helpers),
        location          : options.location,
        webdriver         : options.webdriver || gagarin_options.webdriver,
        windowSize        : options.windowSize,
        capabilities      : options.capabilities,
        dontWaitForMeteor : options.dontWaitForMeteor || gagarin_options.dontWaitForMeteor,
        meteorLoadTimeout : options.meteorLoadTimeout || gagarin_options.meteorLoadTimeout,
      });

      browser.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return browser.init().then(function () {
          if (typeof initialize === 'function') {
            return initialize.length ? browser.promise(initialize) : browser.execute(initialize);
          }
        });
      });

      after(function () {
        return browser.close().quit();
      });

      return browser;
    }

    context.closure = function (listOfKeys, accessor) {
      before(function () {
        stack.push(
          new Closure(stack[stack.length-1], listOfKeys, accessor)
        );
      });
      after(function () {
        stack.pop();
      });
    };

    context.settings = JSON.parse(JSON.stringify(gagarin_settings)); // deep copy :P

    //context.wait = wait;
  });

}

/*
function wait(timeout, message, func, args) {
  "use strict";

  return new Promise(function (resolve, reject) {
    var handle = null;
    (function test() {
      var result;
      try {
        result = func.apply(null, args);
        if (result) {
          resolve(result);
        } else {
          handle = setTimeout(test, 50); // repeat after 1/20 sec.
        }
      } catch (err) {
        reject(err);
      }
    }());
    setTimeout(function () {
      clearTimeout(handle);
      reject(new Error('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.'));
    }, timeout);
  });
}
*/


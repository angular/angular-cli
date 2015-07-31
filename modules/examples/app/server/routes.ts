/// <reference path="../../../server/typings/tsd.d.ts" />

var express = require('express');
var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');

module.exports = function(ROOT) {
  var router = express.Router();

  var universalPath = ROOT + '/dist/examples/app/universal';

  var App     = require(universalPath + '/app/App').App;
  var TodoApp = require(universalPath + '/todo/index').TodoApp;

  var universalServer = require(ROOT + '/dist/server/server');
  var httpInjectables = universalServer.httpInjectables;

  function stringToBoolean(txt) {
    if (typeof txt !== 'string') { return txt; }
    switch (txt.toLowerCase()) {
      case'false': case'\'false\'': case'"false"': case'0': case'no': return false;
      case'true': case'\'true\'': case'"true"': case'1': case'yes': return true;
      default: return txt;
    }
  }

  router.
    route('/').
    get(function ngApp(req, res) {
      res.render('app/universal/app/index', {
        client: stringToBoolean(req.query.client),
        server: stringToBoolean(req.query.server),
        preboot: stringToBoolean(req.query.preboot),
        bootstrap: stringToBoolean(req.query.bootstrap),
        angular: stringToBoolean(req.query.angular),
        componentUrl: 'examples/app/client/app',

        Component: App,
        serverInjector: [
          httpInjectables
        ]

      });
    });

  router.
    route('/examples/todo').
    get(function ngTodo(req, res) {
      res.render('app/universal/todo/index', {
        client: stringToBoolean(req.query.client),
        server: stringToBoolean(req.query.server),
        preboot: stringToBoolean(req.query.preboot),
        bootstrap: stringToBoolean(req.query.bootstrap),
        angular: stringToBoolean(req.query.angular),
        componentUrl: 'examples/app/universal/todo/index',

        Component: TodoApp,
        serverInjector: [
          httpInjectables
        ]

      });

    });


  router.use('/src', function(req, res, next) {
    serveStatic(ROOT + '/src')(req, res, next);
  });

  router.use('/node_modules', function(req, res, next) {
    serveStatic(ROOT + '/node_modules')(req, res, next);
  });

  router.use('/angular2/dist', function(req, res, next) {
    serveStatic(ROOT + '/angular/dist/bundle')(req, res, next);
  });

  router.use('/preboot', function(req, res, next) {
    serveStatic(ROOT + '/modules/examples/preboot_basic')(req, res, next);
  });

  router.use('/web_modules', function(req, res, next) {
    serveStatic(ROOT + '/web_modules')(req, res, next);
  });

  router.use('/bower_components', function(req, res, next) {
    serveStatic(ROOT + '/bower_components')(req, res, next);
  });

  router.use(historyApiFallback({
    // verbose: true
  }));


  return router;
};

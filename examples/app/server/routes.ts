/// <reference path="../../../custom_typings/_custom.d.ts" />

var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');
var {Router} = require('express');


module.exports = function(ROOT) {
  var router = Router();

  var universalPath = ROOT + '/dist/examples/app/universal';

  var {App}     = require(universalPath + '/test_page/app');
  var {TodoApp} = require(universalPath + '/todo/app');

  var {bind} = require('angular2/di');

  var {
    HTTP_BINDINGS,
    SERVER_LOCATION_BINDINGS,
    BASE_URL,
    PRIME_CACHE,
    queryParamsToBoolean
  } = require(ROOT + '/dist/modules/server/server');
  // require('@angular/universal')


  router.
    route('/').
    get(function ngApp(req, res) {
      let baseUrl = 'http://localhost:3000' + req.baseUrl;
      let queryParams = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams, {
        // client url for systemjs
        componentUrl: 'examples/app/universal/test_page/app',

        Component: App,
        serverBindings: [
          HTTP_BINDINGS,
          SERVER_LOCATION_BINDINGS,
          bind(BASE_URL).toValue(baseUrl),
          bind(PRIME_CACHE).toValue(true)
        ],
        data: {},

        preboot: queryParams.preboot === false ? null : {
          start:    true,
          appRoot:  'app',         // selector for root element
          freeze:   'spinner',     // show spinner w button click & freeze page
          replay:   'rerender',    // rerender replay strategy
          buffer:   true,          // client app will write to hidden div until bootstrap complete
          debug:    false,
          uglify:   true,
          presets:  ['keyPress', 'buttonPress', 'focus']
        }

      });

      res.render('app/universal/test_page/index', options);

    });

  router.
    route('/examples/todo').
    get(function ngTodo(req, res) {
      let baseUrl = 'http://localhost:3000' + req.baseUrl;
      let queryParams = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams , {
        // client url for systemjs
        componentUrl: 'examples/app/universal/todo/app',

        Component: TodoApp,
        serverBindings: [
          HTTP_BINDINGS,
          SERVER_LOCATION_BINDINGS,
          bind(BASE_URL).toValue(baseUrl),
          bind(PRIME_CACHE).toValue(true)
        ],
        data: {},

        preboot: queryParams.preboot === false ? null : {
          start:    true,
          appRoot:  'app',         // selector for root element
          freeze:   'spinner',     // show spinner w button click & freeze page
          replay:   'rerender',    // rerender replay strategy
          buffer:   true,          // client app will write to hidden div until bootstrap complete
          debug:    false,
          uglify:   true,
          presets:  ['keyPress', 'buttonPress', 'focus']
        }

      });

      res.render('app/universal/todo/index', options);

    });

  // modules
  router.use('/web_modules', serveStatic(ROOT + '/web_modules'));
  router.use('/bower_components', serveStatic(ROOT + '/bower_components'));


  // needed for sourcemaps

  router.use('/src', serveStatic(ROOT + '/src'));

  router.use('/node_modules',  serveStatic(ROOT + '/node_modules'));
  router.use('/angular2/dist', serveStatic(ROOT + '/angular/dist/bundle'));
  router.use('/examples/app',  serveStatic(ROOT + '/examples/app'));

  router.use(historyApiFallback({
    // verbose: true
  }));


  return router;
};

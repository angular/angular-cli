/// <reference path="../../../custom_typings/_custom.d.ts" />

var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');
var {Router} = require('express');


module.exports = function(ROOT) {
  var router = Router();

  var universalPath = `${ROOT}/dist/examples/app/universal`;

  var appPage = require(`${universalPath}/test_page/app`);
  var todoApp = require(`${universalPath}/todo/app`);
  var routerApp = require(`${universalPath}/test_router/app`);

  var {provide} = require('angular2/core');
  var {ROUTER_PROVIDERS} = require('angular2/router');

  var {
    HTTP_PROVIDERS,
    SERVER_LOCATION_PROVIDERS,
    BASE_URL,
    PRIME_CACHE,
    queryParamsToBoolean
  } = require(`${ROOT}/dist/modules/universal/server/server`);
  // require('angular2-universal')

  router
    .route('/')
    .get(function ngApp(req, res) {
      let baseUrl = `http://localhost:3000${req.baseUrl}`;
      let queryParams = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams, {
        // client url for systemjs
        componentUrl: 'examples/app/universal/test_page/client',

        App: appPage.App,
        providers: [
          // HTTP_PROVIDERS,
          // SERVER_LOCATION_PROVIDERS,
          // provide(BASE_URL, {useExisting: baseUrl}),
          // provide(PRIME_CACHE, {useExisting: true})
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

  router
    .route('/examples/todo')
    .get(function ngTodo(req, res) {
      let baseUrl = `http://localhost:3000/examples/todo${req.baseUrl}`;
      let queryParams = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams , {
        // client url for systemjs
        componentUrl: 'examples/app/universal/todo/client',

        App: todoApp.TodoApp,
        providers: [
          // HTTP_PROVIDERS,
          // SERVER_LOCATION_PROVIDERS,
          // provide(BASE_URL, {useExisting: baseUrl}),
          // provide(PRIME_CACHE, {useExisting: true})
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

  router
    .route('/examples/router')
    .get(function ngTodo(req, res) {
      let baseUrl = `http://localhost:3000/examples/router${req.baseUrl}`;
      let queryParams = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams , {
        // client url for systemjs
        componentUrl: 'examples/app/universal/test_router/client',

        App: routerApp.App,
        providers: [
          // HTTP_PROVIDERS,
          ROUTER_PROVIDERS,
          provide(BASE_URL, {useValue: baseUrl}),
          SERVER_LOCATION_PROVIDERS,
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

      res.render('app/universal/test_router/index', options);

    });


  // needed for sourcemaps

  router.use('/src', serveStatic(`${ROOT}/src`));
  router.use('/angular2', serveStatic(`${ROOT}/node_modules/angular2`));
  router.use('/rxjs', serveStatic(`${ROOT}/node_modules/rxjs`));
  router.use('/node_modules',  serveStatic(`${ROOT}/node_modules`));
  router.use('/examples/app',  serveStatic(`${ROOT}/dist/examples/app`));

  router.use(historyApiFallback({
    // verbose: true
  }));


  return router;
};

var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');
var {Router} = require('express');

var appPage = require('../../universal/test_page/app');
var todoApp = require('../../universal/todo/app');
var routerApp = require('../../universal/test_router/app');
var htmlApp = require('../../universal/html/html');

import {enableProdMode, provide} from 'angular2/core';
import {Http} from 'angular2/http';
import {
  ROUTER_PROVIDERS,
  APP_BASE_HREF,
  LocationStrategy,
  HashLocationStrategy
} from 'angular2/router';

enableProdMode();

import {
  NODE_ROUTER_PROVIDERS,
  NODE_HTTP_PROVIDERS,
  NODE_PLATFORM_PIPES,
  REQUEST_URL,
  BASE_URL,
  queryParamsToBoolean,
  BootloaderConfig
} from 'angular2-universal';

module.exports = function(ROOT) {
  var router = Router();

  router
    .route('/')
    .get(function ngApp(req, res) {
      let queryParams: any = queryParamsToBoolean(req.query);
      let options: BootloaderConfig = Object.assign(queryParams, {
        // client url for systemjs
        buildClientScripts: true,

        // directives: [appPage.App],
        directives: [appPage.App, appPage.MyApp],
        providers: [
          provide(REQUEST_URL, {useValue: req.originalUrl}),
          provide(APP_BASE_HREF, {useValue: '/'}),
          provide(BASE_URL, {useExisting: req.originalUrl}),

          NODE_PLATFORM_PIPES,
          NODE_ROUTER_PROVIDERS,
          NODE_HTTP_PROVIDERS,
        ],
        data: {},

        async: true,

        systemjs: {
          componentUrl: 'examples/src/universal/test_page/browser',
          map: {
            'angular2-universal': 'node_modules/angular2-universal'
          },
          packages: {
            'angular2-universal/polyfills': {
              format: 'cjs',
              main: 'dist/polyfills',
              defaultExtension: 'js'
            },
            'angular2-universal': {
              format: 'cjs',
              main: 'dist/browser/index',
              defaultExtension: 'js'
            }
          }
        },

        preboot: queryParams.preboot === false ? null : {
          appRoot: 'app', // we need to manually include the root

          start:    true,
          freeze:   'spinner',     // show spinner w button click & freeze page
          replay:   'rerender',    // rerender replay strategy
          buffer:   true,          // client app will write to hidden div until bootstrap complete
          debug:    false,
          uglify:   true,
          presets:  ['keyPress', 'buttonPress', 'focus']
        },
        ngOnRendered: () => {
          console.log('DONE');
        },
        ngDoCheck: () => {
          // return true;
        }

      });

      res.render('src/universal/test_page/index', options);

    });

  router
    .route('/examples/todo')
    .get(function ngTodo(req, res) {
      let queryParams: any = queryParamsToBoolean(req.query);
      let options: BootloaderConfig = Object.assign(queryParams , {
        // client url for systemjs
        buildClientScripts: true,
        systemjs: {
          componentUrl: 'examples/src/universal/todo/browser',
          map: {
            'angular2-universal': 'node_modules/angular2-universal'
          },
          packages: {
            'angular2-universal/polyfills': {
              format: 'cjs',
              main: 'dist/polyfills',
              defaultExtension: 'js'
            },
            'angular2-universal': {
              format: 'cjs',
              main: 'dist/browser/index',
              defaultExtension: 'js'
            }
          }
        },
        directives: [todoApp.TodoApp],
        providers: [
          // NODE_HTTP_PROVIDERS,
          // NODE_ROUTER_PROVIDERS,
          // provide(BASE_URL, {useExisting: req.originalUrl}),
        ],
        data: {},

        preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

      });

      res.render('src/universal/todo/index', options);

    });
    router
      .route('/examples/html')
      .get(function ngHtml(req, res) {
        let queryParams: any = queryParamsToBoolean(req.query);
        let options: BootloaderConfig = Object.assign(queryParams , {
          // client url for systemjs
          buildClientScripts: true,
          systemjs: {
            componentUrl: 'examples/src/universal/html/browser',
            map: {
              'angular2-universal': 'node_modules/angular2-universal'
            },
            packages: {
              'angular2-universal/polyfills': {
                format: 'cjs',
                main: 'dist/polyfills',
                defaultExtension: 'js'
              },
              'angular2-universal': {
                format: 'cjs',
                main: 'dist/browser/index',
                defaultExtension: 'js'
              }
            }
          },
          directives: [htmlApp.Html],
          providers: [
            provide(APP_BASE_HREF, {useValue: '/examples/html'}),
            provide(REQUEST_URL, {useValue: req.originalUrl}),
            provide(BASE_URL, {useExisting: req.originalUrl}),

            NODE_PLATFORM_PIPES,
            NODE_ROUTER_PROVIDERS,
            NODE_HTTP_PROVIDERS,
            provide(LocationStrategy, { useClass: HashLocationStrategy })
          ],
          data: {},

          preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

        });

        res.render('src/universal/html/index', options);

      });
  router
    .route('/examples/falcor_todo')
    .get(function ngTodo(req, res) {
      let queryParams: any = queryParamsToBoolean(req.query);
      let options = Object.assign(queryParams , {
        // client url for systemjs
        buildClientScripts: true,
        systemjs: {
          componentUrl: 'examples/src/universal/falcor_todo/client',
          map: {
            'angular2-universal': 'node_modules/angular2-universal'
          },
          packages: {
            'angular2-universal/polyfills': {
              format: 'cjs',
              main: 'dist/polyfills',
              defaultExtension: 'js'
            },
            'angular2-universal': {
              format: 'cjs',
              main: 'dist/browser/index',
              defaultExtension: 'js'
            }
          }
        },

        directives: [todoApp.TodoApp],
        providers: [
          // NODE_HTTP_PROVIDERS,
          // NODE_ROUTER_PROVIDERS,
          // provide(REQUEST_URL, {useExisting: req.originalUrl}),
        ],
        data: {},

        preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

      });

      res.render('src/universal/falcor_todo/index', options);

    });

  function ngRouter(req, res) {
    let baseUrl = '/examples/router';
    let url = req.originalUrl.replace(baseUrl, '') || '/';
    let queryParams: any = queryParamsToBoolean(req.query);

    let options: BootloaderConfig = Object.assign(queryParams , {
      // client url for systemjs
      buildClientScripts: true,
      systemjs: {
        componentUrl: 'examples/src/universal/test_router/browser',
        map: {
          'angular2-universal': 'node_modules/angular2-universal'
        },
        packages: {
          'angular2-universal/polyfills': {
            format: 'cjs',
            main: 'dist/polyfills',
            defaultExtension: 'js'
          },
          'angular2-universal': {
            format: 'cjs',
            main: 'dist/browser/index',
            defaultExtension: 'js'
          }
        }
      },
      // ensure that we test only server routes
      client: false,

      directives: [routerApp.App],
      providers: [
        // NODE_HTTP_PROVIDERS,
        provide(APP_BASE_HREF, {useValue: baseUrl}),
        provide(REQUEST_URL, {useValue: url}),
        ROUTER_PROVIDERS,
        NODE_ROUTER_PROVIDERS,
      ],
      data: {},

      preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

    });

    res.render('src/universal/test_router/index', options);

  }

  router
    .get('/examples/router', ngRouter)
    .get('/examples/router/home', ngRouter)
    .get('/examples/router/about', ngRouter);


  // needed for sourcemaps

  router.use('/src', serveStatic(`${ROOT}/src`));
  router.use('/angular2', serveStatic(`${ROOT}/node_modules/angular2`));
  router.use('/rxjs', serveStatic(`${ROOT}/node_modules/rxjs`));
  router.use('/node_modules',  serveStatic(`${ROOT}/node_modules`));
  router.use('/examples/src',  serveStatic(`${ROOT}/dist`));
  router.use('/css',  serveStatic(`${ROOT}/src/server/universal`));

  router.use(historyApiFallback({
    // verbose: true
  }));


  return router;
};

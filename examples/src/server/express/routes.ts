var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');
var {Router} = require('express');

var appPage = require('../../universal/test_page/app');
var todoApp = require('../../universal/todo/app');
var routerApp = require('../../universal/test_router/app');
var newRouterApp = require('../../universal/test_new_router/app');
var htmlApp = require('../../universal/html/html');
var jsonpApp = require('../../universal/test_jsonp/app');
var templateUrlApp = require('../../universal/template_url/app');

import {enableProdMode, provide} from '@angular/core';
import {Http} from '@angular/http';
import {LocationStrategy, HashLocationStrategy} from '@angular/common';
import {provideRouter} from '@angular/router';

enableProdMode();

import {
  NODE_ROUTER_PROVIDERS,
  NODE_LOCATION_PROVIDERS,
  NODE_HTTP_PROVIDERS,
  NODE_JSONP_PROVIDERS,
  NODE_PLATFORM_PIPES,
  ORIGIN_URL,
  REQUEST_URL,
  BASE_URL,
  queryParamsToBoolean,
  BootloaderConfig
} from 'angular2-universal';

const PACKAGES = {
  'angular2-universal/polyfills': {
    format: 'cjs',
    main: 'dist/polyfills',
    defaultExtension: 'js'
  },
  'angular2-universal': {
    format: 'cjs',
    main: 'dist/browser/index',
    defaultExtension: 'js'
  },
  '@angular/core': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/router-deprecated': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/router': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/platform-browser': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/platform-browser-dynamic': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/http': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/common': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  },
  '@angular/compiler': {
    format: 'cjs',
    main: 'index',
    defaultExtension: 'js'
  }
};

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
        directives: [ appPage.App, appPage.MyApp ],
        platformProviders: [
          provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
          provide(BASE_URL, {useValue: '/'}),
        ],
        providers: [
          provide(REQUEST_URL, {useValue: req.originalUrl}),

          ...NODE_PLATFORM_PIPES,
          ...NODE_ROUTER_PROVIDERS,
          ...NODE_HTTP_PROVIDERS,
        ],
        data: {},

        systemjs: {
          componentUrl: 'examples/src/universal/test_page/browser',
          map: {
            'angular2-universal': 'node_modules/angular2-universal',
            '@angular': 'node_modules/@angular'
          },
          packages: PACKAGES,
        },

        async: queryParams.async === false ? false : true,
        beautify: queryParams.beautify === false ? false : true,

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
          console.log('DONE\n');
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
            'angular2-universal': 'node_modules/angular2-universal',
            '@angular': 'node_modules/@angular'
          },
          packages: PACKAGES
        },
        directives: [todoApp.TodoApp],
        platformProviders: [
          provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
          provide(BASE_URL, {useValue: '/examples/todo'}),
        ],
        providers: [
          provide(REQUEST_URL, {useValue: req.originalUrl}),
          ...NODE_HTTP_PROVIDERS,
          ...NODE_ROUTER_PROVIDERS,
        ],
        data: {},
        async: queryParams.async === false ? false : true,
        preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

      });

      res.render('src/universal/todo/index', options);

    });

    router
      .route('/examples/template_url')
      .get(function ngTemplateUrl(req, res) {

        let queryParams: any = queryParamsToBoolean(req.query);
        let options: BootloaderConfig = Object.assign(queryParams , {
          // client url for systemjs
          buildClientScripts: true,
          systemjs: {
            componentUrl: 'examples/src/universal/template_url/browser',
            map: {
              'angular2-universal': 'node_modules/angular2-universal',
              '@angular': 'node_modules/@angular'
            },
            packages: PACKAGES
          },
          // ngOnStable: () => {
          //   return new Promise(resolve => {
          //     setTimeout(() => {
          //       resolve();
          //     }, 500);
          //   });
          // },
          directives: [templateUrlApp.App],
          platformProviders: [
            provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
            provide(BASE_URL, {useValue: '/examples/template_url'}),
          ],
          providers: [
            provide(REQUEST_URL, {useValue: req.originalUrl}),

          ],
          data: {},

          async: queryParams.async === false ? false : true,
          preboot: queryParams.preboot === false ? null : {debug: true, uglify: false}

        });

        res.render('src/universal/template_url/index', options);

      });

    router
      .route('/examples/html')
      .get(function ngHtml(req, res) {
        let queryParams: any = queryParamsToBoolean(req.query);
        let options: BootloaderConfig = Object.assign(queryParams , {
          // client url for systemjs
          directives: [htmlApp.Html],
          platformProviders: [
            provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
            provide(BASE_URL, {useValue: '/'})
          ],
          providers: [
            provide(REQUEST_URL, {useValue: req.originalUrl}),

            NODE_PLATFORM_PIPES,
            NODE_ROUTER_PROVIDERS,
            NODE_HTTP_PROVIDERS,
            provide(LocationStrategy, { useClass: HashLocationStrategy })
          ],
          data: {},

          preboot: false // queryParams.preboot === false ? null : {debug: true, uglify: false}

        });

        res.render('src/universal/html/index', options);

      });

      router
        .route('/examples/jsonp')
        .get(function ngJsonp(req, res) {
          let queryParams: any = queryParamsToBoolean(req.query);
          let options: BootloaderConfig = Object.assign(queryParams , {
            // client url for systemjs
            buildClientScripts: true,
            systemjs: {
              componentUrl: 'examples/src/universal/test_jsonp/browser',
              map: {
                'angular2-universal': 'node_modules/angular2-universal',
                '@angular': 'node_modules/@angular'
              },
              packages: PACKAGES
            },
            directives: [jsonpApp.App],
            platformProviders: [
              provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
              provide(BASE_URL, {useValue: '/examples/jsonp'})
            ],
            providers: [
              provide(REQUEST_URL, {useValue: req.originalUrl}),

              NODE_PLATFORM_PIPES,
              NODE_ROUTER_PROVIDERS,
              NODE_HTTP_PROVIDERS,
              NODE_JSONP_PROVIDERS,
              provide(LocationStrategy, { useClass: HashLocationStrategy })
            ],
            data: {},

            preboot: false // queryParams.preboot === false ? null : {debug: true, uglify: false}

          });

          res.render('src/universal/test_jsonp/index', options);

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
            'angular2-universal': 'node_modules/angular2-universal',
            '@angular': 'node_modules/@angular'
          },
          packages: PACKAGES
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
          'angular2-universal': 'node_modules/angular2-universal',
          '@angular': 'node_modules/@angular'
        },
        packages: PACKAGES
      },
      // ensure that we test only server routes
      client: false,

      directives: [routerApp.App],
      platformProviders: [
        provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
        provide(BASE_URL, {useValue: '/examples/router'})
      ],
      providers: [
        NODE_HTTP_PROVIDERS,
        provide(REQUEST_URL, {useValue: url}),
        NODE_ROUTER_PROVIDERS,
      ],
      data: {},

      preboot: false // queryParams.preboot === false ? null : {debug: true, uglify: false}

    });

    res.render('src/universal/test_router/index', options);

  }

  router
    .get('/examples/router', ngRouter)
    .get('/examples/router/home', ngRouter)
    .get('/examples/router/about', ngRouter);


      function ngNewRouter(req, res) {
        let baseUrl = '/examples/new_router';
        let url = req.originalUrl.replace(baseUrl, '') || '/';
        let queryParams: any = queryParamsToBoolean(req.query);

        let options: BootloaderConfig = Object.assign(queryParams , {
          // client url for systemjs
          buildClientScripts: true,
          systemjs: {
            componentUrl: 'examples/src/universal/test_router/browser',
            map: {
              'angular2-universal': 'node_modules/angular2-universal',
              '@angular': 'node_modules/@angular'
            },
            packages: PACKAGES
          },
          // ensure that we test only server routes
          client: false,

          directives: [newRouterApp.App],
          platformProviders: [
            provide(ORIGIN_URL, {useValue: 'http://localhost:3000'}),
            provide(BASE_URL, {useValue: '/examples/new_router'})
          ],
          providers: [
            NODE_HTTP_PROVIDERS,
            provide(REQUEST_URL, {useValue: url}),
            provideRouter(newRouterApp.routes),
            NODE_LOCATION_PROVIDERS
          ],
          data: {},

          preboot: false // queryParams.preboot === false ? null : {debug: true, uglify: false}

        });

        res.render('src/universal/test_new_router/index', options);

      }

      router
        .get('/examples/new_router', ngNewRouter)
        .get('/examples/new_router/index', ngNewRouter)
        .get('/examples/new_router/home', ngNewRouter)
        .get('/examples/new_router/about', ngNewRouter);


  // needed for sourcemaps

  router.use('/src', serveStatic(`${ROOT}/src`));
  router.use('/@angular', serveStatic(`${ROOT}/node_modules/@angular`));
  router.use('/rxjs', serveStatic(`${ROOT}/node_modules/rxjs`));
  router.use('/node_modules',  serveStatic(`${ROOT}/node_modules`));
  router.use('/examples/src',  serveStatic(`${ROOT}/dist`));
  router.use('/css',  serveStatic(`${ROOT}/src/server/universal`));

  router.use(historyApiFallback({
    // verbose: true
  }));


  return router;
};

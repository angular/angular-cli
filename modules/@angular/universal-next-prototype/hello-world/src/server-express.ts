import './polyfills.node';

import * as path from 'path';
import * as express from 'express';
// import * as bodyParser from 'body-parser';

import * as preboot from 'preboot';

console.log(preboot);

// Angular 2
import { enableProdMode, ApplicationRef, PlatformRef, NgZone, APP_ID } from '@angular/core';
enableProdMode();

// Angular 2 Universal
import { expressEngine } from '@angular/express-engine';
import { replaceUniversalAppIf, transformDocument, UNIVERSAL_APP_ID, nodePlatform } from '@angular/universal';
nodePlatform();

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
// enable prod for faster renders

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Express View
app.engine('.html', expressEngine);
app.set('views', __dirname);
app.set('view engine', 'html');

// Serve static files
app.use(express.static(ROOT, {index: false}));


import { main as ngApp } from './main.node';
// Routes with html5pushstate

var cache = null;
app.use('/', function (req, res, next) {

  // if (cache) {
  //   res.setHeader('Cache-Control', 'public, max-age=300');
  //   res.status(200).send(cache);
  //   return next();
  // }

  return ngApp()
    .then((nodeRef) => {
      let appInjector = nodeRef.applicationRef.injector;
      let cmpInjector = nodeRef.componentRef.injector;
      // app injector
      let ngZone = appInjector.get(NgZone);
      // component injector
      // let http = cmpInjector.get(Http, Http);
      // let jsonp = cmpInjector.get(Jsonp, Jsonp);
      // if (ngZone.isStable) { return nodeRef }

      return ngZone.runOutsideAngular(function outsideNg() {
        function checkStable(done, ref) {
          setTimeout(function stable() {
            if (ngZone.hasPendingMicrotasks) { return checkStable(done, ref); }
            if (ngZone.hasPendingMacrotasks) { return checkStable(done, ref); }
            // if (http && http._async > 0) { return next(); }
            // if (jsonp && jsonp._async > 0) { return next(); }
            if (ngZone.isStable) { return done(ref); }
            return checkStable(done, ref);
          }, 1);
        }
        return new Promise<any>(function (resolve) {
          checkStable(resolve, nodeRef);
        }); // promise
      });// run outside

    })
    .then((nodeRef) => {
      let _appId = nodeRef.componentRef.injector.get(APP_ID, null);
      let appId = nodeRef.componentRef.injector.get(UNIVERSAL_APP_ID, null);
      let DOM = getDOM();
      DOM.setAttribute(nodeRef.componentRef.location.nativeElement, 'data-ng-app-id', appId);

      let html = nodeRef.serializeDocument();
      nodeRef.componentRef.destroy();
      nodeRef.applicationRef.dispose();

      nodeRef.componentRef = null;
      nodeRef.applicationRef = null;

      let prebootInline = preboot.getInlineCode({
        appRoot: 'app'
      });

      return replaceUniversalAppIf(transformDocument(html), _appId, appId)
        .replace(/<\/body>/, `
  <script type="application/angular">
    ${prebootInline}
    window.ngUniversal = {
      appId: "${ appId }" || null
    };
  </script>
</body>`);
    })
    .then(html => {
      // cache = html;
      // res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).send(html);
      next();
    });

});

// Server
app.listen(3000, () => {
  console.log('Listening on: http://localhost:3000');
});

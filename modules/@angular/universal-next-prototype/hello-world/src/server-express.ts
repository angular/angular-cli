import './polyfills.node';

import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';

// Angular 2
import { enableProdMode, ApplicationRef, PlatformRef } from '@angular/core';
// Angular 2 Universal
import { expressEngine } from '@angular/express-engine';

// enable prod for faster renders
enableProdMode();

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
    .then(({componentRef, html}) => {
      var applicationRef = componentRef.injector.get(ApplicationRef, {dispose: () => {}});
      applicationRef.dispose();
      return html;
    })
    .then(html => {
      // cache = html;
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).send(html);
      next();
    });

});

// Server
app.listen(3000, () => {
  console.log('Listening on: http://localhost:3000');
});

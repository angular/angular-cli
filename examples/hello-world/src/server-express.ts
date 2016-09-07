import './polyfills.node';

import * as path from 'path';
import * as express from 'express';

// import * as bodyParser from 'body-parser';
// import * as preboot from 'preboot';
// console.log(preboot);

// Angular 2
import { enableProdMode, ApplicationRef, PlatformRef, NgZone, APP_ID } from '@angular/core';
enableProdMode();

// Angular 2 Universal
// import { expressEngine } from '@angular/express-engine';
// import { replaceUniversalAppIf, transformDocument, UNIVERSAL_APP_ID, nodePlatform } from '@angular/universal';
// nodePlatform();

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
// enable prod for faster renders

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Express View
// app.engine('.html', expressEngine);
// app.set('views', __dirname);
// app.set('view engine', 'html');

// Serve static files
app.use(express.static(ROOT, { index: false }));


import { main as ngApp } from './main.node';
// Routes with html5pushstate

app.get('/', function (req, res, next) {

  var documentHtml = `
    <!doctype>
    <html lang="en">
    <head>
      <title>Angular 2 Universal Starter</title>
      <meta charset="UTF-8">
      <meta name="description" content="Angular 2 Universal">
      <meta name="keywords" content="Angular 2,Universal">
      <meta name="author" content="PatrickJS">

      <link rel="icon" href="data:;base64,iVBORw0KGgo=">

      <base href="/">
    <body>

      <button onclick="bootstrap()">Bootstrap Client</button>
      <button onclick="location.reload()">Reload Client</button>

      <app>
        Loading...
      </app>
      <another-component></another-component>

      <script src="dist/public/browser-bundle.js"></script>
    </body>
    </html>
  `;

  return ngApp(documentHtml, { time: true, asyncDestroy: true }).then(html => {
    res.status(200).send(html);
    next();
    return html;
  });

});

// use indexFile over ngApp only when there is too much load on the server
// app.get('/', indexFile);
function indexFile(req, res) {
  // when there is too much load on the server just send
  // the index.html without prerendering for client-only
  res.sendFile('/index.html', {root: __dirname});
}


// Server
app.listen(3000, () => {
  console.log('Listening on: http://localhost:3000');
});

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
  return ngApp().then(html => {
    // console.log(html);
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

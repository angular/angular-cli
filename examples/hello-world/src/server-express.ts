import './polyfills.node';

import * as path from 'path';
import * as express from 'express';

import { enableProdMode } from '@angular/core';
// Angular 2 Universal
enableProdMode();


const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Express View
// app.engine('.html', expressEngine);
// app.set('views', __dirname);
// app.set('view engine', 'html');

// Serve static files
app.use(express.static(ROOT, { index: false }));


import { main as ngApp } from './app.node.module';
// Routes with html5pushstate
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

app.get('/', function (req, res, next) {
  var id = s4();
  var cancel = false;
  req.on('close', function() {
    console.log('Client closed the connection ', id);
    cancel = true;
  });
  if (cancel) { return next(); }
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

      <div style="position: absolute;z-index: 1000000;bottom: 9px">
        <button onclick="bootstrap()">Bootstrap Client</button>
        <button onclick="location.reload()">Reload Client</button>
      </div>

      <app>
        Loading...
      </app>
      <another-component></another-component>

      <script src="dist/public/browser-bundle.js"></script>
    </body>
    </html>
  `;


  return ngApp(documentHtml, { id, time: true, asyncDestroy: true, cancelHandler: () => cancel }).then(html => {
    // console.log('\nexpress route\n');
    res.status(200).send(html);
    next();
    return html;
  }).catch(err => {
    // console.log('\nexpress route error\n');
    res.status(200).send(documentHtml);
    next();
    return documentHtml;
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

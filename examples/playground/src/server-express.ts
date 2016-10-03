// Universal polyfills required
import './polyfills/polyfills.node';

// Express & Node imports
import * as path from 'path';
import * as express from 'express';

// Angular 2
import { enableProdMode } from '@angular/core';
// enable prod for faster renders
enableProdMode();

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Serve static files
app.use(express.static(ROOT, { index: false }));

// main contains the NgModule container/module for Universal
// returns a serialized document string
import { main as ngApp } from './app.node.module';

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

      <app>
        Loading...
      </app>
      <another-component></another-component>

      <script src="dist/public/browser-bundle.js"></script>
    </body>
    </html>
  `;

  return ngApp(documentHtml).then(html => {
    // html === serialized document string after being ran through Universal

    // Send the html as a response
    res.status(200).send(html);
    next();
    return html;
  });

});

app.get('/crisis-center/admin', function (req, res, next) {
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

      <app>
        Loading...
      </app>
      <another-component></another-component>

      <script src="dist/public/browser-bundle.js"></script>
    </body>
    </html>
  `;

  return ngApp(documentHtml).then(html => {
    // html === serialized document string after being ran through Universal

    // Send the html as a response
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

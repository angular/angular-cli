import './polyfills.node';

import { enableProdMode } from '@angular/core';
// Enable production mode
enableProdMode();

import { main } from './main.node';

var documentHtml = `
<!doctype>
  <html lang="en">
  <head>
    <title>Angular 2 Universal Starter</title>
    <meta charset="UTF-8">
    <meta name="description" content="Angular 2 Universal">
    <meta name="keywords" content="Angular 2, Universal">
    <meta name="author" content="PatrickJS">

    <link rel="icon" href="data:;base64,iVBORw0KGgo=">

    <base href="/">
  <body>
    <button onclick="bootstrap()">Bootstrap Client</button>

    <app>
      Loading...
    </app>
    <another-component></another-component>

    <script src="dist/public/browser-bundle.js"></script>
  </body>
  </html>
`;

var arr = new Array(100).fill(null); // var arr = new Array(20).fill(null);

function createApp(num) {
  return main(documentHtml, {id: num, time: true, asyncDestroy: true});
}

var promises = arr.reduce((memo, wat, num) => {
  return memo.then(() => {
    console.time('app' + num);
    return createApp(num).then(() => {
      console.timeEnd('app' + num);
      console.log('\n-----------\n');
    });
  });
}, Promise.resolve());

promises
.then(html => {
  console.log('done');
  // process.exit();
  return html;
});

import './polyfills.node';
import { enableProdMode, ApplicationRef, PlatformRef, NgZone, APP_ID } from '@angular/core';
enableProdMode();

import {main} from './main.node';

var doc =`<!doctype>
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
`
var arr = new Array(7).fill(null);
function createApp(num) {
  return main(doc, {id: num});
}
var promises = arr.reduce((memo, wat, num) => {
  return memo.then(() => {
    return createApp(num);
  });
}, Promise.resolve());

promises
.then(html => {
  console.log('done');
  process.exit();
  return html;
});

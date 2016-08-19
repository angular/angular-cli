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
debugger
main(doc, {id: 0}).then(html => {
  return Promise.all([
    main(doc, {id: 1}),
    main(doc, {id: 2}),
    main(doc, {id: 3}),
    main(doc, {id: 4}),
    main(doc, {id: 5}),
    main(doc, {id: 6}),
    main(doc, {id: 7}),
  ])
})
.then(html => {
  console.log('done');
  return html;
});

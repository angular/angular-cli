import './polyfills.browser';
import { enableProdMode } from '@angular/core';
enableProdMode();

import {main} from './main.browser';

var _win: any = window;
let bootOnce = false;
let bootTimer = null;

_win.bootstrap = function bootstrap() {
  clearTimeout(bootTimer);
  if (bootOnce) { return; }
  bootOnce = true;
  console.time('boot');
  main().then(() => {
    console.timeEnd('boot');
  });
};

bootTimer = setTimeout(() => {
  _win.bootstrap();
}, 5000);

// if (document.readyState === 'complete') {
//   _win.bootstrap();
// } else {
//   document.addEventListener('DOMContentLoaded', _win.bootstrap);
// }

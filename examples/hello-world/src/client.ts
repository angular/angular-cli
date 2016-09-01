console.time('boot');
import './polyfills.browser';
import { enableProdMode } from '@angular/core';
enableProdMode();

import {main} from './main.browser';


// setTimeout(function () {
(<any>window).boot = function() {
// document.addEventListener('DOMContentLoaded', () => {
  main().then(() => {
    console.timeEnd('boot');
  });
// });
// }, 3000);
}

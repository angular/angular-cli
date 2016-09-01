console.time('Client Bootstrap Time:');

import './polyfills/polyfills.browser';
import { enableProdMode } from '@angular/core';
enableProdMode();

import { main as ngApp } from './main.browser';

ngApp().then(() => {
  console.timeEnd('Client Bootstrap Time:');
});

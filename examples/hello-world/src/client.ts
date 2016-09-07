import './polyfills.browser';
import { enableProdMode } from '@angular/core';
enableProdMode();

import {main} from './main.browser';


let bootOnce = false;
(<any>window).bootstrap = function bootstrap() {
  if (bootOnce) return;
  bootOnce = true;
  console.time('boot');
  main().then(() => {
    console.timeEnd('boot');
  });
}

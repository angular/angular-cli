console.time('boot');
import './polyfills.browser';

import {main} from './main.browser';


// setTimeout(function () {
  main().then(() => {
    console.timeEnd('boot');
  });
// }, 3000);

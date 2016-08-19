import {bootstrap} from '@angular/platform-browser-dynamic';
import {HTTP_PROVIDERS} from '@angular/http';
import {isBrowser} from '@angular/universal/browser';
import {prebootClient} from 'preboot';

import {App, APP_PROVIDERS} from './app';
export function main() {
  console.log('isBrowser', isBrowser);

  // timeout to test preboot
  setTimeout(function () {
    return bootstrap(App, [
      ...APP_PROVIDERS,
      ...HTTP_PROVIDERS
    ])
      .then(() => {
        let preboot = prebootClient();
        preboot.complete();
      });
  }, 3000);
}

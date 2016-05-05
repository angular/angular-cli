import {bootstrap} from '@angular/platform-browser-dynamic';
import {ROUTER_PROVIDERS} from '@angular/router-deprecated';

import {App} from './app';

export function main() {
  return bootstrap(App, [
    ROUTER_PROVIDERS
  ]);
}

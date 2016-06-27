import {bootstrap} from '@angular/platform-browser-dynamic';
import {provideRouter} from '@angular/router';

import {App, routes} from './app';

export function main() {
  return bootstrap(App, [
    provideRouter(routes, {enableTracing: true})
  ]);
}

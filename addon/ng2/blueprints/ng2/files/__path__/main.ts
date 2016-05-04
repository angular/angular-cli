import { bootstrap } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { <%= jsComponentName %>AppComponent, environment } from './app/';

if (environment.production) {
  enableProdMode();
}

bootstrap(<%= jsComponentName %>AppComponent);

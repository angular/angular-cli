import {bootstrap} from '@angular/platform-browser-dynamic';
import {enableProdMode} from '@angular/core';
import {environment} from './app/environment';
import {<%= jsComponentName %>App} from './app/<%= htmlComponentName %>.component';

if (environment.production) {
  enableProdMode();
}

bootstrap(<%= jsComponentName %>App);

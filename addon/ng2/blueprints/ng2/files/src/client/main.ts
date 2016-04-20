import {bootstrap} from 'angular2/platform/browser';
import {enableProdMode} from 'angular2/core';
import {<%= jsComponentName %>App, environment} from './app/';

if (environment.production) {
  enableProdMode();
}

bootstrap(<%= jsComponentName %>App);

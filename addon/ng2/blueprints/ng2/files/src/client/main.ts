import {bootstrap} from 'angular2/platform/browser';
import {enableProdMode} from 'angular2/core';
import {environment} from './app/environment';
import {<%= jsComponentName %>App} from './app/<%= htmlComponentName %>.component';

if (environment.production) {
  enableProdMode();
}

bootstrap(<%= jsComponentName %>App);

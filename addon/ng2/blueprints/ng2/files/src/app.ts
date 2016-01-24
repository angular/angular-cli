import {provide} from 'angular2/core';
import {bootstrap} from 'angular2/platform/browser';
import {
  ROUTER_PROVIDERS,
  HashLocationStrategy,
  LocationStrategy
} from 'angular2/router';


import {<%= jsComponentName %>App} from './app/<%= htmlComponentName %>';


bootstrap(<%= jsComponentName %>App, [
  ROUTER_PROVIDERS, provide(LocationStrategy, { useClass: HashLocationStrategy })]);

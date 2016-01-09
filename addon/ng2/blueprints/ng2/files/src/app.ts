import {bootstrap} from 'angular2/platform/browser';
import {<%= jsComponentName %>App} from './app/<%= htmlComponentName %>';
import {ROUTER_PROVIDERS} from 'angular2/router';

bootstrap(<%= jsComponentName %>App, [
  ROUTER_PROVIDERS
]);

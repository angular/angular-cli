/// <reference path="../../../custom_typings/_custom.d.ts" />

console.time('angular2/angular2 in client');
import * as angular from 'angular2/angular2';

import {bind, OpaqueToken} from 'angular2/di';
import {ShadowDomStrategy, NativeShadowDomStrategy} from 'angular2/render';
import {httpInjectables} from 'angular2/http';
console.timeEnd('angular2/angular2 in client');
import {App} from '../universal/app/App';


export function main() {
  return angular.bootstrap(App, [
    httpInjectables
    // doesn't work with server rendering
    // bind(ShadowDomStrategy).toClass(NativeShadowDomStrategy),
  ]);
}

console.time('angular2/core in client');
import * as angular from 'angular2/core';
console.timeEnd('angular2/core in client');

import {bootstrap} from 'angular2/platform/browser';

import {App} from './app';

export function main() {
  return bootstrap(App);
}

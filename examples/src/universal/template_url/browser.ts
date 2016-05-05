console.time('@angular/core in client');
import * as angular from '@angular/core';
console.timeEnd('@angular/core in client');

import {bootstrap} from '@angular/platform-browser-dynamic';

import {App} from './app';

export function main() {
  return bootstrap(App);
}

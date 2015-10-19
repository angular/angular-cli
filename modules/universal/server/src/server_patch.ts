/// <reference path="../typings/tsd.d.ts" />


// polyfills
import 'es6-shim';
// typescript emit metadata
import 'reflect-metadata';
// zone.js to track promises
import 'zone.js/dist/zone-microtask';

// dom closure
import {Parse5DomAdapter} from 'angular2/src/core/dom/parse5_adapter';
Parse5DomAdapter.makeCurrent();

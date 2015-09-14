/// <reference path="../typings/tsd.d.ts" />


// typescript decoratos
import 'reflect-metadata';

// polyfills
import 'angular2/node_modules/traceur/bin/traceur-runtime';

// angular 2 assert
// import 'angular2/node_modules/rtts_assert/src/rtts_assert';

// dom closure
import {Parse5DomAdapter} from 'angular2/src/core/dom/parse5_adapter';
Parse5DomAdapter.makeCurrent();

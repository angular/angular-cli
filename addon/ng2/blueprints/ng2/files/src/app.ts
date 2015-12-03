/// <reference path="node_modules/angular2/manual_typings/globals-es6.d.ts"/> 
// this should be remove after fixing https://github.com/angular/angular/issues/5596

import {bootstrap} from 'angular2/platform/browser';
import {<%= jsComponentName %>App} from './app/<%= htmlComponentName %>';


bootstrap(<%= jsComponentName %>App);

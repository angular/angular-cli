/// <reference path="../../typings/tsd.d.ts" />
import {bind} from 'angular2/angular2';
import {ExceptionHandler} from 'angular2/src/core/facade/exceptions';
import {DOM} from 'angular2/src/core/dom/dom_adapter';

export const EXCEPTION_BINDING =
    bind(ExceptionHandler).toFactory(() => new ExceptionHandler(DOM, false), []);

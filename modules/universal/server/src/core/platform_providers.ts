import {provide} from 'angular2/core';
import {ExceptionHandler} from 'angular2/src/facade/exceptions';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';

export const EXCEPTION_PROVIDERS =
    provide(ExceptionHandler, {useFactory: () => new ExceptionHandler(DOM, false), deps: []});

import {provide} from 'angular2/angular2';
import {ExceptionHandler} from 'angular2/src/facade/exceptions';
import {DOM} from 'angular2/src/core/dom/dom_adapter';

export const EXCEPTION_PROVIDERS =
    provide(ExceptionHandler, {useFactory: () => new ExceptionHandler(DOM, false), deps: []});

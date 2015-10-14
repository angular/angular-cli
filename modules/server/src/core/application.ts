/// <reference path="../../typings/tsd.d.ts" />
import {
  bind,
  Binding,
  Injector,
  OpaqueToken,
  ComponentRef
} from 'angular2/angular2';

import {compilerBindings} from 'angular2/src/core/compiler/compiler';

import {
  NumberWrapper,
  Type,
  isBlank,
  isPresent,
  assertionsEnabled,
  print,
  stringify
} from 'angular2/src/core/facade/lang';


import {serverBootstrap} from './application_common';


export function bootstrap(appComponentType: /*Type*/ any,
                          appBindings: Array<Type | Binding | any[]> = null):
    Promise<ComponentRef> {

  let bindings = [ compilerBindings() ];

  if (isPresent(appBindings)) {
    bindings.push(appBindings);
  }

  return serverBootstrap(appComponentType, bindings);
}

/// <reference path="../../typings/tsd.d.ts" />
import {
  bind,
  Provider,
  Injector,
  OpaqueToken,
  ComponentRef
} from 'angular2/angular2';

import {compilerProviders} from 'angular2/src/core/compiler/compiler';
// import {Promise} from 'angular2/src/core/facade/async';
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
                          appProviders: Array<Type | Provider | any | any[]> = null):
    Promise<ComponentRef> {

  let providers = [ compilerProviders() ];

  if (isPresent(appProviders)) {
    providers.push(appProviders);
  }

  return serverBootstrap(appComponentType, providers);
}

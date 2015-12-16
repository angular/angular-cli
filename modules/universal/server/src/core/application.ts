import {
  bind,
  Provider,
  Injector,
  OpaqueToken,
  ComponentRef
} from 'angular2/core';

import {COMPILER_PROVIDERS} from 'angular2/compiler';
import {Promise} from 'angular2/src/facade/async';
import {
  NumberWrapper,
  Type,
  isBlank,
  isPresent,
  assertionsEnabled,
  print,
  stringify
} from 'angular2/src/facade/lang';


import {serverBootstrap} from './application_common';


export function bootstrap(appComponentType: /*Type*/ any,
                          appProviders: Array<Type | Provider | any | any[]> = null):
    Promise<ComponentRef> {

  let providers = [COMPILER_PROVIDERS];

  if (isPresent(appProviders)) {
    providers.push(appProviders);
  }

  return serverBootstrap(appComponentType, providers);
}

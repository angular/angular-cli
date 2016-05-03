import {Type} from 'angular2/src/facade/lang';
import {Provider, ComponentRef} from 'angular2/core';
import {bootstrap as bootstrapClient} from 'angular2/platform/browser';

var prebootCompleted = false;

export function prebootComplete(value?: any) {
  if ('preboot' in window && !prebootCompleted) {
    (<any>window).preboot.complete();
  }
  return value;
}

export function bootstrap(appComponentType: /*Type*/ any,
                          appProviders: Array<Type | Provider | any | any[]> = null):
  Promise<ComponentRef> {

  return bootstrapClient(appComponentType, appProviders)
    .then(prebootComplete);
}

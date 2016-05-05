import {Type} from '@angular/core/src/facade/lang';
import {Provider} from '@angular/core';
import {bootstrapStatic as bootstrapClient} from '@angular/platform-browser';
import {ComponentRef} from '@angular/core/src/linker/component_factory';

var prebootCompleted = false;

export function prebootComplete(value?: any) {
  if ('preboot' in window && !prebootCompleted) {
    (<any>window).preboot.complete();
  }
  return value;
}

export function bootstrap(appComponentType: /*Type*/ any,
                          appProviders: Array<Type | Provider | any | any[]> = null):
  Promise<ComponentRef<any>> {

  return bootstrapClient(appComponentType, appProviders)
    .then(prebootComplete);
}

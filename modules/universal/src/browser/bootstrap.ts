import { ComponentRef, Type, Provider } from '@angular/core';
import {bootstrap as bootstrapClient} from '@angular/platform-browser-dynamic';

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

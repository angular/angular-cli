import {Type} from 'angular2/src/facade/lang';
import {Provider} from 'angular2/core';
import {bootstrap as bootstrapClient} from 'angular2/platform/browser';
import {ComponentRef} from 'angular2/src/core/linker/dynamic_component_loader';

export function prebootComplete(value?: any) {
  if ('preboot' in window) {
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





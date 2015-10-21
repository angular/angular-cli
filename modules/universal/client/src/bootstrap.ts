import {Type} from 'angular2/src/core/facade/lang';
import {Provider, bootstrap as bootstrapClient} from 'angular2/angular2';
import {ComponentRef} from 'angular2/src/core/linker/dynamic_component_loader';
// import {Promise} from 'angular2/src/core/facade/async';

export function bootstrap(appComponentType: /*Type*/ any,
                          appProviders: Array<Type | Provider | any | any[]> = null):
  Promise<ComponentRef> {

  return bootstrapClient(appComponentType, appProviders)
    .then((appRef: ComponentRef) => {
      if ('preboot' in window) {
        (<any>window).preboot.complete();
      }
      return appRef;
    });
}



import { NgModule, NgModuleFactoryLoader, ModuleWithProviders, StaticProvider } from '@angular/core';

import { ModuleMapNgFactoryLoader, ModuleMap, MODULE_MAP } from './module-map-ngfactory-loader';

/**
 * Helper function for getting the providers object for the MODULE_MAP
 *
 * @param {ModuleMap} moduleMap Map to use as a value for MODULE_MAP
 */
export function provideModuleMap(moduleMap: ModuleMap): StaticProvider {
  return {
    provide: MODULE_MAP,
    useValue: moduleMap
  };
}

/**
 * Module for using a NgModuleFactoryLoader which does not lazy load
 */
@NgModule({
  providers: [
    {
      provide: NgModuleFactoryLoader,
      useClass: ModuleMapNgFactoryLoader
    }
  ]
})
export class ModuleMapLoaderModule {
  /**
   * Returns a ModuleMapLoaderModule along with a MODULE_MAP
   *
   * @param {ModuleMap} moduleMap Map to use as a value for MODULE_MAP
   */
  static withMap(moduleMap: ModuleMap): ModuleWithProviders {
    return {
      ngModule: ModuleMapLoaderModule,
      providers: [
        {
          provide: MODULE_MAP,
          useValue: moduleMap
        }
      ]
    };
  }
}

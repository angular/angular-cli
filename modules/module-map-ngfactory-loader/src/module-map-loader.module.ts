/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  NgModule,
  NgModuleFactoryLoader,
  ModuleWithProviders,
  StaticProvider
} from '@angular/core';

import { ModuleMapNgFactoryLoader, MODULE_MAP } from './module-map-ngfactory-loader';
import {ModuleMap} from './module-map';

/**
 * Helper function for getting the providers object for the MODULE_MAP
 *
 * @param moduleMap Map to use as a value for MODULE_MAP
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
   * @param moduleMap Map to use as a value for MODULE_MAP
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

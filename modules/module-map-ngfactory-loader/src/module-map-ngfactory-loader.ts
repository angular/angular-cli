/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Compiler,
  Inject,
  Injectable,
  InjectionToken,
  NgModuleFactory,
  NgModuleFactoryLoader,
  Type
} from '@angular/core';
import { ModuleMap } from './module-map';

/**
 * Token used by the ModuleMapNgFactoryLoader to load modules
 */
export const MODULE_MAP: InjectionToken<ModuleMap> = new InjectionToken('MODULE_MAP');

/**
 * NgModuleFactoryLoader which does not lazy load
 */
@Injectable()
export class ModuleMapNgFactoryLoader implements NgModuleFactoryLoader {
  constructor(private compiler: Compiler, @Inject(MODULE_MAP) private moduleMap: ModuleMap) { }

  load(loadChildrenString: string): Promise<NgModuleFactory<any>> {
    const offlineMode = this.compiler instanceof Compiler;
    const type = this.moduleMap[loadChildrenString];

    if (!type) {
      throw new Error(`${loadChildrenString} did not exist in the MODULE_MAP`);
    }

    return offlineMode ?
      this.loadFactory(type as NgModuleFactory<any>) : this.loadAndCompile(type as Type<any>);
  }

  private loadFactory(factory: NgModuleFactory<any>): Promise<NgModuleFactory<any>> {
    return new Promise(resolve => resolve(factory));
  }

  private loadAndCompile(type: Type<any>): Promise<NgModuleFactory<any>> {
    return this.compiler.compileModuleAsync(type);
  }
}

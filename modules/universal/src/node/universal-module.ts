import { NgModule } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  platformNodeDynamic
} from '../lib';

export const platformUniversalDynamic = platformNodeDynamic;

@NgModule({
  imports: [],
  exports: [,
    NodeHttpModule,
    NodeJsonpModule
  ],
  providers: []
})
export class UniversalModule {
  static withConfig(config = {}) {
    var {ngModule, providers} = NodeModule.withConfig(config);
    var nodeNgModules = [
      ngModule,
      NodeHttpModule,
      NodeJsonpModule
    ];

    @NgModule({ exports: nodeNgModules })
    class UniversalModuleDynamic {}

    return {
      ngModule: UniversalModuleDynamic,
      providers: providers || []
    };
  }
}

import { NgModule } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule
} from '../lib';

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
    class _UniversalModule {}

    return {
      ngModule: _UniversalModule,
      providers: providers || []
    }
  }
}

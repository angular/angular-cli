import { NgModule, PlatformRef } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  NodePlatform,
  platformNodeDynamic
} from '../lib';

export type NodePlatformRef = PlatformRef & NodePlatform;

export function platformUniversalDynamic (extraProviders?: any[]): NodePlatformRef {
  const platform: NodePlatformRef = platformNodeDynamic(extraProviders);
  return platform;
};

@NgModule({
  exports: [
    NodeModule,
    NodeHttpModule,
    NodeJsonpModule
  ]
})
export class UniversalModule {
  static withConfig(config = {}): {ngModule: UniversalModule, providers: any[]} {
    var {providers} = NodeModule.withConfig(config);
    return {
      ngModule: UniversalModule,
      providers: providers || []
    };
  }
}

import { platformCoreDynamic } from '@angular/compiler';

import {
  createPlatformFactory,
} from '@angular/core';


import {
  INTERNAL_NODE_PLATFORM_PROVIDERS,
  NodePlatform,
  __PLATFORM_REF
} from '@angular/platform-node';
/**
 * The node platform that supports the runtime compiler.
 *
 * @experimental
 */
export const platformDynamicNode = (extraProviders?: any[]) => {
  const platform = __PLATFORM_REF || createPlatformFactory(platformCoreDynamic, 'nodeDynamic', INTERNAL_NODE_PLATFORM_PROVIDERS)(extraProviders);
  return new NodePlatform(platform);
}


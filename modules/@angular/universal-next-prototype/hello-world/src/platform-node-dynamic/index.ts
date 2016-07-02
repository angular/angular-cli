import {ComponentRef} from '@angular/core';

import {DomSharedStylesHost, SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DomRootRenderer} from '@angular/platform-browser/src/dom/dom_renderer';
import {RootRenderer} from '@angular/core/src/render/api';

import {AnimationDriver, NoOpAnimationDriver} from '@angular/core/src/animation/animation_driver';
import {WebAnimationsDriver} from '@angular/platform-browser/src/dom/web_animations_driver';

import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';
import {BROWSER_APP_COMPILER_PROVIDERS} from '@angular/platform-browser-dynamic';
import {BROWSER_APP_PROVIDERS} from '@angular/platform-browser';

import {serverBootstrap} from '@angular/platform-server';


import {
  NodeDomRootRenderer_,
  NodeSharedStylesHost
} from '@angular/platform-node';

export function bootstrap(component: any, providers: Array<any> = []): Promise<ComponentRef<any>> {
  return serverBootstrap(component, [
      BROWSER_APP_PROVIDERS,
      BROWSER_APP_COMPILER_PROVIDERS,
      {provide: AnimationDriver, useFactory: NoOpAnimationDriver},
      {provide: WebAnimationsDriver, useExisting: AnimationDriver},

      {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
      {provide: RootRenderer, useExisting: DomRootRenderer},

      NodeSharedStylesHost,
      {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
      {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},

    ...providers
  ]);
}

import {OpaqueToken, ReflectiveInjector, coreLoadAndBootstrap, createPlatform, getPlatform, assertPlatform, ComponentRef} from '@angular/core';

import {DomSharedStylesHost, SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DomRootRenderer} from '@angular/platform-browser/src/dom/dom_renderer';
import {RootRenderer} from '@angular/core/src/render/api';

import {AnimationDriver, NoOpAnimationDriver} from '@angular/core/src/animation/animation_driver';
import {WebAnimationsDriver} from '@angular/platform-browser/src/dom/web_animations_driver';

import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';
import {BROWSER_APP_COMPILER_PROVIDERS} from '@angular/platform-browser-dynamic';
import {BROWSER_APP_PROVIDERS} from '@angular/platform-browser';

import {serverBootstrap, SERVER_PLATFORM_PROVIDERS} from '@angular/platform-server';


import {
  PROXY_DOCUMENT,
  parseDocument,
  NodeDomRootRenderer_,
  NodeSharedStylesHost
} from '@angular/platform-node';


import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
function _document(): any {
  return {};
}

export const NODE_PLATFORM_MARKER = new OpaqueToken('NODE_PLATFORM_MARKER');

export const NODE_PLATFORM_PROVIDERS = [
  {provide: NODE_PLATFORM_MARKER, useValue: true},
  ...SERVER_PLATFORM_PROVIDERS,
  BROWSER_APP_PROVIDERS
    .filter(provider => provider.provide !== DOCUMENT)
    .filter(provider => provider.provide !== RootRenderer)
    .filter(provider => provider.provide !== DomRootRenderer),
  ...BROWSER_APP_COMPILER_PROVIDERS,
  {provide: AnimationDriver, useFactory: NoOpAnimationDriver},
  {provide: WebAnimationsDriver, useExisting: AnimationDriver},

  {provide: DOCUMENT, useFactory: () => [], deps: []},
  // {
  //   provide: DOCUMENT,
  //   useFactory: _document,
  //   deps: [DomSharedStylesHost]
  // },
  // {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
  // {provide: RootRenderer, useExisting: DomRootRenderer},

  // {provide: PROXY_DOCUMENT, useFactory: () => {}, deps: []},

  NodeSharedStylesHost,
  {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
  {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},
];

export function nodePlatform(providers = []) {
  if (!getPlatform()) {
    var nodeInjector = ReflectiveInjector.resolveAndCreate(NODE_PLATFORM_PROVIDERS);
    createPlatform(nodeInjector);
  }
  return assertPlatform(NODE_PLATFORM_MARKER)
}

export const NODE_INJECTOR = nodePlatform();

import {ReflectionCapabilities} from '@angular/core/src/reflection/reflection_capabilities';
import {reflector} from '@angular/core/src/reflection/reflection';

export function bootstrap(component: any, providers: Array<any> = [], document: string): Promise<ComponentRef<any>> {
  console.log('bootstrap')
  reflector.reflectionCapabilities = new ReflectionCapabilities();
  // let injector = NODE_INJECTOR.injector;
  let doc = parseDocument(document);
  // doc.set()
  const nodeInjector = ReflectiveInjector.resolveAndCreate([
    // {provide: DOCUMENT, useFactory: () => doc, deps: []},
    NodeDomRootRenderer_,
    {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
    {provide: RootRenderer, useExisting: DomRootRenderer},
    ...providers
  ], NODE_INJECTOR.injector);
  // let renderer = nodeInjector.get(DomRootRenderer);
  // renderer.setDoc(doc)

  return coreLoadAndBootstrap(component, nodeInjector);
}

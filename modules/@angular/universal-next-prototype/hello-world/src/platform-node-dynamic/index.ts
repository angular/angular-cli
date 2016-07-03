import {
  OpaqueToken,
  ReflectiveInjector,
  coreLoadAndBootstrap,
  createPlatform,
  getPlatform,
  assertPlatform,
  ComponentRef,
  PlatformRef,
  APP_ID,
  ApplicationRef,
  Injectable,
  APPLICATION_COMMON_PROVIDERS,
  ComponentResolver,
  NgZone,
  Testability
} from '@angular/core';


import {RuntimeCompiler} from '@angular/compiler';

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


// private
import {ReflectionCapabilities} from '@angular/core/src/reflection/reflection_capabilities';
import {reflector} from '@angular/core/src/reflection/reflection';
import {ViewUtils} from '@angular/core/src/linker/view_utils';
import {PLATFORM_CORE_PROVIDERS} from '@angular/core/src/application_ref';
import {SanitizationService} from '@angular/core/src/security';
import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
function _document(): any {
  return {};
}
// private

@Injectable()
class WatViewUtils {
  constructor() {
  }
  renderComponent() {

  }
}

export const NODE_PLATFORM_MARKER = new OpaqueToken('NODE_PLATFORM_MARKER');


export function arrayFlattenTree(children: any[], arr: any[]): any[] {
  for (let child of children) {
    if (Array.isArray(child)) {
      arrayFlattenTree(child, arr);
    } else {
      arr.push(child);
    }
  }
  return arr;
}

export const NODE_PLATFORM_PROVIDERS = arrayFlattenTree([
  {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: true}), deps: []},
  {provide: NODE_PLATFORM_MARKER, useValue: true},
  ...SERVER_PLATFORM_PROVIDERS,
  ...BROWSER_APP_PROVIDERS,
  ...BROWSER_APP_COMPILER_PROVIDERS,
  {provide: AnimationDriver, useFactory: NoOpAnimationDriver},
  {provide: WebAnimationsDriver, useExisting: AnimationDriver},


  {provide: DOCUMENT, useFactory: () => [], deps: []},
  // {
  //   provide: DOCUMENT,
  //   useFactory: _document,
  //   deps: [DomSharedStylesHost]
  // },
  {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
  {provide: RootRenderer, useExisting: DomRootRenderer},
  {provide: ViewUtils, useFactory: () => new WatViewUtils()},

  // {provide: PROXY_DOCUMENT, useFactory: () => {}, deps: []},

  NodeSharedStylesHost,
  {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
  {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},

].filter(wat => wat !== APPLICATION_COMMON_PROVIDERS), [])
.filter(provider => {
  return notTokens(provider, [
    // NgZone
//     // DOCUMENT,
//     // RootRenderer,
//     // DomRootRenderer,
//     // ViewUtils,
//     // SharedStylesHost,
//     // DomSharedStylesHost
  ]);
})

console.log('NODE_PLATFORM_PROVIDERS\n', NODE_PLATFORM_PROVIDERS.map((provider, id) => {
  let token = provider.provide || provider;
  return (token.id || id) + ': ' + (token.name || token._desc);
}));


function notToken(provider, token) {
  if (!provider) { return true; }
  if (provider.provide) {

    // if (provider.provide.constructor && token.constructor) {
    //   return provider.provide.constructor !== token.constructor;
    // }

    return provider.provide !== token;

  }
  // else if (provider.constructor && token.constructor) {
  //   return provider.constructor !== token.constructor;
  // }
  else if (provider && token) {
    return provider !== token;
  }
  else {
    return true
  }
}

function notTokens(provider, tokens) {
  return tokens.reduce((memo, token) => memo && notToken(provider, token), true);
}

export function nodePlatform(providers = []) {
  if (!getPlatform()) {
    var nodeInjector = ReflectiveInjector.resolveAndCreate(NODE_PLATFORM_PROVIDERS);
    createPlatform(nodeInjector);
  }
  return assertPlatform(NODE_PLATFORM_MARKER)
}

// export const NODE_PROVIDERS = ReflectiveInjector.resolve(NODE_PLATFORM_PROVIDERS);
export const NODE_PLATFORM = nodePlatform(NODE_PLATFORM_PROVIDERS);
// NODE_PLATFORM.injector.get()


export function bootstrap(component: any, providers: Array<any> = []): Promise<ComponentRef<any>> {
  reflector.reflectionCapabilities = new ReflectionCapabilities();
  // let injector = NODE_INJECTOR.injector;
  // let doc = parseDocument(document);
  // doc.set()
  // const parentNodeInjector = ReflectiveInjector.resolveAndCreate([
  //   ...PLATFORM_CORE_PROVIDERS,
  //   {provide: DOCUMENT, useFactory: () => doc, deps: []},
  //   NodeDomRootRenderer_,
  //   {provide: DomRootRenderer, useExisting: NodeDomRootRenderer_},
  //   {provide: RootRenderer, useExisting: DomRootRenderer},
  //   ViewUtils,
  // ]);
  // parentNodeInjector.get(PlatformRef);

  // const nodeInjector = ReflectiveInjector.fromResolvedProviders(NODE_PROVIDERS, parentNodeInjector);


  // const nodeInjector = ReflectiveInjector.resolveAndCreate([
  //   NODE_INJECTOR.injector
  // ], parentNodeInjector);
  const appInjector = ReflectiveInjector.resolveAndCreate(arrayFlattenTree([
    // ...PLATFORM_CORE_PROVIDERS,
    ...APPLICATION_COMMON_PROVIDERS,
    NodeSharedStylesHost,
    {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
    {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},

    // {provide: DOCUMENT, useFactory: () => doc, deps: []},

    {
      provide: ViewUtils,
      useFactory: (_renderer, _appId, sanitizer) => {
        return new ViewUtils(_renderer, _appId, sanitizer);
      },
      deps: [RootRenderer, APP_ID, SanitizationService]
    },
    NodeDomRootRenderer_,
    {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
    {provide: RootRenderer, useExisting: DomRootRenderer},
    {provide: ComponentResolver, useExisting: RuntimeCompiler},

    ...providers
  ], []).filter(wat => wat !== NgZone), NODE_PLATFORM.injector);

  // appInjector.get(DomRootRenderer);
  // appInjector.get(RootRenderer);
  // appInjector.get(ViewUtils);
  // appInjector.get(DOCUMENT);
  // appInjector.get(ApplicationRef);
  // appInjector.get(NgZone);
  // appInjector.get(Testability);
  // renderer.setDoc(doc)

  return coreLoadAndBootstrap(component, appInjector);
}

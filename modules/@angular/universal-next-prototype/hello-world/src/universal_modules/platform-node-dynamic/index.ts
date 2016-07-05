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
  parseDocument,
  arrayFlattenTree,
  NodeDomRootRenderer_,
  NodeSharedStylesHost,
  NODE_LOCATION_PROVIDERS
} from '@angular/platform-node';
import {provideUniversalAppId} from '@angular/universal';

// private
import {APP_ID_RANDOM_PROVIDER} from '@angular/core/src/application_tokens';
import {ReflectionCapabilities} from '@angular/core/src/reflection/reflection_capabilities';
import {reflector} from '@angular/core/src/reflection/reflection';
import {ViewUtils} from '@angular/core/src/linker/view_utils';
import {PLATFORM_CORE_PROVIDERS, ApplicationRef_} from '@angular/core/src/application_ref';
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



export const NODE_PLATFORM_PROVIDERS = arrayFlattenTree([
  {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: true}), deps: []},
  {provide: NODE_PLATFORM_MARKER, useValue: true},
  ...SERVER_PLATFORM_PROVIDERS,
  // ...BROWSER_APP_PROVIDERS,
  ...BROWSER_APP_COMPILER_PROVIDERS,
  {provide: AnimationDriver, useFactory: NoOpAnimationDriver},
  {provide: WebAnimationsDriver, useExisting: AnimationDriver},


].filter(wat => wat !== APPLICATION_COMMON_PROVIDERS), [])

console.log('\nNODE_PLATFORM_PROVIDERS\n', NODE_PLATFORM_PROVIDERS.map((provider, id) => {
  let token = provider.provide || provider;
  return (token.id || id) + ': ' + (token.name || token._desc);
}));

export function nodePlatform(nodeProviders = []) {
  if (!getPlatform()) {
    var nodeInjector = ReflectiveInjector.resolveAndCreate(NODE_PLATFORM_PROVIDERS.concat(nodeProviders));
    createPlatform(nodeInjector);
  }
  return assertPlatform(NODE_PLATFORM_MARKER)
}

reflector.reflectionCapabilities = new ReflectionCapabilities();

export function bootstrap(
  component: any,
  providers: Array<any> = [],
  nodeProviders: Array<any> = []): Promise<ComponentRef<any>> {


  const appProviders = arrayFlattenTree([

    // ...PLATFORM_CORE_PROVIDERS,
    ...BROWSER_APP_PROVIDERS,//.filter(wat => wat !== APPLICATION_COMMON_PROVIDERS),
    // ...APPLICATION_COMMON_PROVIDERS,

    provideUniversalAppId(),

    NodeSharedStylesHost,
    {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
    {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},

    // {provide: DOCUMENT, useFactory: () => doc, deps: []},
    // APP_ID_RANDOM_PROVIDER,
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
  ], []).filter(wat => (wat !== NgZone && wat !== APP_ID_RANDOM_PROVIDER));

  console.log('\nNODE_APP_PROVIDERS\n', appProviders.map((provider, id) => {
    let token = provider.provide || provider;
    return (token.id || NODE_PLATFORM_PROVIDERS.length + id) + ': ' + (token.name || token._desc);
  }))

  const appInjector = ReflectiveInjector.resolveAndCreate(appProviders, nodePlatform().injector)

  return coreLoadAndBootstrap(component, appInjector);
}

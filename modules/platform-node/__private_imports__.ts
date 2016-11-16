import { __platform_browser_private__ } from '@angular/platform-browser';
import { __core_private__ } from '@angular/core';
import { __compiler_private__ } from '@angular/compiler';

// PRIVATE
const {
  BROWSER_SANITIZATION_PROVIDERS,
  SharedStylesHost,
  DomSharedStylesHost,
  DomRootRenderer,
  DomEventsPlugin,
  KeyEventsPlugin,
  DomAdapter,
  setRootDomAdapter,
  HammerGesturesPlugin
} = __platform_browser_private__;

const {
  ViewUtils,
  AnimationKeyframe,
  AnimationPlayer,
  AnimationStyles,
  RenderDebugInfo
} = __core_private__;

const {
  SelectorMatcher,
  CssSelector
} = __compiler_private__;



// @internal
export {
  // platform-browser
  BROWSER_SANITIZATION_PROVIDERS,
  SharedStylesHost,
  DomSharedStylesHost,
  DomRootRenderer,
  DomEventsPlugin,
  DomAdapter,
  setRootDomAdapter,
  KeyEventsPlugin,
  HammerGesturesPlugin,

  // compiler
  SelectorMatcher,
  CssSelector,


  // core
  ViewUtils,
  AnimationKeyframe,
  AnimationPlayer,
  AnimationStyles,
  RenderDebugInfo,

}

var __empty: {} = null;

export default __empty;

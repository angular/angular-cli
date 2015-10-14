/// <reference path="../../typings/tsd.d.ts" />
import {
  bind,
  Inject,
  Injectable,
  Binding,
  Injector,
  OpaqueToken
} from 'angular2/angular2';

import {
  ListWrapper,
  MapWrapper,
  Map,
  StringMapWrapper,
  List
} from 'angular2/src/core/facade/collection';
import {
  DomRenderer,
  DomRenderer_,
  RenderElementRef,
  Renderer,
  DOCUMENT
} from 'angular2/src/core/render/render';
import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {EventManager} from 'angular2/src/core/render/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/core/render/dom/shared_styles_host';
import {TemplateCloner} from 'angular2/src/core/render/dom/template_cloner';
import {DOM} from 'angular2/src/core/dom/dom_adapter';

function resolveInternalDomView(viewRef) {
  return viewRef;
}

function resolveInternalDomFragment(fragmentRef) {
  return fragmentRef.nodes;
}

export {
  DOCUMENT,
  DomRenderer,
  DomRenderer_
};

@Injectable()
export class ServerDomRenderer_ extends DomRenderer_ {
  constructor(
    private _eventManager: EventManager,
    private _domSharedStylesHost: DomSharedStylesHost,
    private _animate: AnimationBuilder,
    @Inject(DOCUMENT) document) {
     super(_eventManager, _domSharedStylesHost, _animate, document);
  }

  setElementProperty(location: RenderElementRef, propertyName: string, propertyValue: any) {
    if (propertyName === 'value' || (propertyName === 'checked' && propertyValue !== false)) {
      var view = resolveInternalDomView(location.renderView);
      var element = view.boundElements[location.renderBoundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        view.setElementAttribute(location.renderBoundElementIndex, propertyName, propertyValue);
        return;
      }
    }
    return super.setElementProperty(location, propertyName, propertyValue);
  }

  invokeElementMethod(location: RenderElementRef, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      var view = resolveInternalDomView(location.renderView);
      var element = view.boundElements[location.renderBoundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        view.setElementAttribute(location.renderBoundElementIndex, 'autofocus', null);
        return;
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


export const SERVER_DOM_RENDERER_BINDINGS = [
  bind(DomRenderer).toClass(ServerDomRenderer_),
  bind(Renderer).toClass(DomRenderer)
];


/// <reference path="../typings/tsd.d.ts" />
import {ListWrapper, MapWrapper, Map, StringMapWrapper, List} from 'angular2/src/facade/collection';
import {
  DomRenderer,
  RenderElementRef,
  Renderer,
  DOCUMENT,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES
} from 'angular2/render';
import {EventManager} from 'angular2/src/render/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/render/dom/view/shared_styles_host';
import {TemplateCloner} from 'angular2/src/render/dom/template_cloner';
import {resolveInternalDomView} from 'angular2/src/render/dom/view/view';
import {DOM} from 'angular2/src/dom/dom_adapter';
import {bind, Injectable, Inject} from 'angular2/di';

@Injectable()
export class ServerDomRenderer extends DomRenderer {
  constructor(
    private _eventManager: EventManager,
    private _domSharedStylesHost: DomSharedStylesHost,
    private _templateCloner: TemplateCloner,
    @Inject(DOCUMENT) document,
    @Inject(DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES) reflectPropertiesAsAttributes: boolean
  ) {
     super(_eventManager, _domSharedStylesHost, _templateCloner, document, reflectPropertiesAsAttributes);
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

  invokeElementMethod(location: RenderElementRef, methodName: string, args: List<any>) {
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


export var serverDomRendererInjectables = [
  ServerDomRenderer,
  bind(Renderer).toClass(ServerDomRenderer)
];


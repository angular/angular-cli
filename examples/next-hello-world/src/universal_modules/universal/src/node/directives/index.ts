import { Directive, ElementRef } from '@angular/core';

// PRIVATE
import { DomSharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
// PRIVATE

@Directive({
  selector: 'universal-styles-host'
})
export class NodeUniversalStylesHost {
  constructor(el: ElementRef, domSharedStylesHost: DomSharedStylesHost) {
    domSharedStylesHost.addHost(el.nativeElement);
  }
}



export const UNIVERSAL_DIRECTIVES  = [
  NodeUniversalStylesHost
];

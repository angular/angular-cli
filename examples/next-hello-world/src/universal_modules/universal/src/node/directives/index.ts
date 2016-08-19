import { Directive, ElementRef, NgModule, OnInit } from '@angular/core';

// PRIVATE
import { DomSharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
// PRIVATE

@Directive({
  selector: 'universal-styles-host'
})
export class NodeUniversalStylesHost implements OnInit {
  constructor(public el: ElementRef, public domSharedStylesHost: DomSharedStylesHost) {}
  ngOnInit() {
    this.domSharedStylesHost.addHost(this.el.nativeElement);
  }

}



export const UNIVERSAL_DIRECTIVES  = [
  NodeUniversalStylesHost
];




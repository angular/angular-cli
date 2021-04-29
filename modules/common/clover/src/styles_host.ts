/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DOCUMENT, ɵgetDOM as getDOM } from '@angular/common';
import { APP_ID, Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { ɵSharedStylesHost as SharedStylesHost } from '@angular/platform-browser';

declare let ngDevMode: boolean | {} | undefined;

@Injectable()
export class SSRStylesHost extends SharedStylesHost implements OnDestroy {
  private head: HTMLHeadElement | null;
  private _styleNodes = new Set<HTMLElement>();
  private _styleNodesInDOM: Map<string | null, HTMLElement> | undefined;

  constructor(
    @Inject(DOCUMENT) private doc: Document,
    @Optional() @Inject(APP_ID) private appId?: string,
  ) {
    super();
    this.head = this.doc.querySelector('head');
    const styles = this.head?.querySelectorAll(`style[ng-style='${this.appId}']`);
    if (styles?.length) {
      const items = Array.from(styles) as HTMLElement[];
      this._styleNodesInDOM = new Map(items.map((el) => [el.textContent, el]));
    }
  }

  private _addStyle(style: string): void {
    const element = this._styleNodesInDOM?.get(style);
    if (element) {
      if (typeof ngDevMode !== undefined && ngDevMode) {
        element.setAttribute('_ng-style-re-used', '');
      }

      this._styleNodesInDOM?.delete(style);
      this._styleNodes.add(element);

      return;
    }

    const el = getDOM().createElement('style');
    el.textContent = style;

    if (this.appId) {
      el.setAttribute('ng-style', this.appId);
    }

    if (this.head) {
      this.head.appendChild(el);
    }

    this._styleNodes.add(el);
  }

  onStylesAdded(additions: Set<string>) {
    additions.forEach((style) => this._addStyle(style));
  }

  addHost(_hostNode: Node): void {
    // stub
  }

  removeHost(_hostNode: Node): void {
    // stub
  }

  ngOnDestroy() {
    this._styleNodes.forEach((styleNode) => styleNode.remove());
  }
}

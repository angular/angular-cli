import {Inject, Injectable} from '@angular/core';
import {SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';

import {Parse5DomAdapter} from '@angular/platform-server';
Parse5DomAdapter.makeCurrent(); // ensure Parse5DomAdapter is used
import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
var DOM: any = getDOM();

@Injectable()
export class NodeSharedStylesHost extends SharedStylesHost {
  private _hostNodes = new Set<Node>();
  constructor() {
    super();
  }
  /** @internal */
  _addStylesToHost(styles: string[], host: Node) {
    for (var i = 0; i < styles.length; i++) {
      var style = styles[i];
      DOM.appendChild(host, DOM.createStyleElement(style));
    }
  }
  addHost(hostNode: Node) {
    this._addStylesToHost((<any>this)._styles, hostNode);
    this._hostNodes.add(hostNode);
  }
  removeHost(hostNode: Node) {
    this._hostNodes.delete(hostNode);
  }

  onStylesAdded(additions: string[]) {
    this._hostNodes.forEach((hostNode) => {
      this._addStylesToHost(additions, hostNode);
    });
  }
}

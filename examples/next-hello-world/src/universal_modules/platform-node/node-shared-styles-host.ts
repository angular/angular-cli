import { Injectable } from '@angular/core';
import { SharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';

import { getDOM } from '@angular/platform-browser/src/dom/dom_adapter';

@Injectable()
export class NodeSharedStylesHost extends SharedStylesHost {
  private _hostNodes = new Set<Node>();
  private _styles: any;
  constructor() {
    super();
  }
  addHost(hostNode: Node) {
    this._addStylesToHost(this._styles, hostNode);
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

  private _addStylesToHost(styles: string[], host: Node) {
    for (var i = 0; i < styles.length; i++) {
      var style = styles[i];
      getDOM().appendChild(host, getDOM().createStyleElement(style));
    }
  }

}

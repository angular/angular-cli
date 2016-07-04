import {Injectable} from '@angular/core';
import {SetWrapper} from '@angular/core/src/facade/collection';
import {SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';

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
      getDOM().appendChild(host, getDOM().createStyleElement(style));
    }
  }
  addHost(hostNode: Node) {
    this._addStylesToHost((<any>this)._styles, hostNode);
    this._hostNodes.add(hostNode);
  }
  removeHost(hostNode: Node) {
    SetWrapper.delete(this._hostNodes, hostNode);
  }

  onStylesAdded(additions: string[]) {
    this._hostNodes.forEach((hostNode) => {
      this._addStylesToHost(additions, hostNode);
    });
  }
}

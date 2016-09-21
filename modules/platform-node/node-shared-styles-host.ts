// PRIVATE
import { getDOM } from './get-dom';
// PRIVATE

import { Injectable } from '@angular/core';

@Injectable()
export class SharedStylesHost {
  _styles: string[] = [];
  _stylesSet = new Set<string>();

  constructor() {}

  addStyles(styles: string[]) {
    var additions: any[] /** TODO #9100 */ = [];
    styles.forEach(style => {
      if (!this._stylesSet.has(style)) {
        this._stylesSet.add(style);
        this._styles.push(style);
        additions.push(style);
      }
    });
    this.onStylesAdded(additions);
  }

  onStylesAdded(_additions: string[]) {}

  getAllStyles(): string[] { return this._styles; }
}

@Injectable()
export class NodeSharedStylesHost extends SharedStylesHost {
  _hostNodes = new Set<Node>();
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
    for (let i = 0; i < styles.length; i++) {
      let style = styles[i];
      getDOM().appendChild(host, getDOM().createStyleElement(style));
    }
  }

}

import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {Inject, Injectable} from 'angular2/src/core/di';
import {SetWrapper} from 'angular2/src/facade/collection';
import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {SharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';

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
    SetWrapper.delete(this._hostNodes, hostNode);
  }

  onStylesAdded(additions: string[]) {
    this._hostNodes.forEach((hostNode) => {
      this._addStylesToHost(additions, hostNode);
    });
  }
}

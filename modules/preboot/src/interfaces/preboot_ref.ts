import {PrebootOptions} from './preboot_options';
import {Element} from './element';

export interface DomState {
  window?: Element;
  document?: Element;
  body?: Element;
  appRoot?: Element;
  serverRoot?: Element;
  clientRoot?: Element;
}

export interface CursorSelection {
  start?: number;
  end?: number;
  direction?: string;
}

// interface for the dom wrapper
export interface Dom {
  state?: DomState;
  init?(opts: any);
  updateRoots?(appRoot: Element, serverRoot?: Element, clientRoot?: Element);
  getDocumentNode?(selector: string): Element;
  getAppNode?(selector: string): Element;
  getNodeKey?(node: Element, rootNode: Element): string;
  getAllAppNodes?(selector: string): Element[];
  getClientNodes?(selector: string): Element[];
  onLoad?(handler: Function);
  on?(eventName: string, handler: Function);
  dispatchGlobalEvent?(eventName: string);
  dispatchNodeEvent?(node: Element, eventName: string);
  appContains?(node: Element): Boolean;
  addNodeToBody?(type: string, className: string, styles: Object);
  removeNode?(node: Element);
  findClientNode?(serverNode: Element, nodeKey?: any): Element;
  getSelection?(node: Element): CursorSelection;
  setSelection?(node: Element, selection: CursorSelection);
}

// interface for preboot modules available to strategies
export interface PrebootRef {
  dom: Dom;
  log?: Function;
  activeNode?: any;
  time?: number;
  selection?: CursorSelection;
}

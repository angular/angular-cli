import {PrebootOptions} from './preboot_options';
import {Element} from './element';
import { AppState } from './app';

export interface CursorSelection {
  start?: number;
  end?: number;
  direction?: string;
}

// interface for the dom wrapper
export interface Dom {
  getDocumentNode?(app: AppState): Element;
  getAppNode?(app: AppState, selector: string): Element;
  getNodeKey?(node: Element, rootNode: Element): string;
  getAllAppNodes?(app: AppState, selector: string): Element[];
  getClientNodes?(app: AppState, selector: string): Element[];
  onLoad?(handler: Function);
  on?(eventName: string, handler: Function);
  dispatchGlobalEvent(app: AppState, eventName: string);
  dispatchNodeEvent(app: AppState, node: Element, eventName: string);
  appContains(app: AppState, node: Element): Boolean;
  addNodeToBody(app: AppState, type: string, className: string, styles: Object): Element;
  removeNode?(node: Element);
  findClientNode(app: AppState, serverNode: Element, nodeKey?: any): Element ;
  getSelection?(node: Element): CursorSelection;
  setSelection?(node: Element, selection: CursorSelection);
}

/*
// interface for preboot modules available to strategies
export interface PrebootRef {
  dom: Dom;
  log?: Function;
  activeNode?: any;
  time?: number;
  selection?: CursorSelection;
}
*/

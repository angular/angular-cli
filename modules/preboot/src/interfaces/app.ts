import { Element } from './element';
import { PrebootOptions } from './preboot_options';
import { CursorSelection } from './preboot_ref';

export interface App {
    initAppRoot?(app: AppState, options: any);
    updateAppRoots?(app: AppState, appRoot: any, serverRoot?: any, clientRoot?: any);
    addApp?(appRoot: string, options: PrebootOptions);
    getApp?(appRoot: string);
    onLoad?(app: AppState, handler: Function);
    on?(app: AppState, eventName: string, handler: Function);
    getDocumentNode?(app: AppState): Element;
    getAppNode?(app: AppState, selector: string): Element;
    getAllAppNodes?(app: AppState, selector: string): Element[];
    getClientNodes?(app: AppState, selector: string): Element[];
    dispatchGlobalEvent?(app: AppState, eventName: string);
    dispatchNodeEvent?(app: AppState, node: Element, eventName: string);
    appContains?(app: AppState, node: Element);
    addNodeToBody?(app: AppState, type: string, className: string, styles: Object): Element;
    removeNode?(node: Element);
    getSelection?(node: Element): CursorSelection;
    setSelection?(node: Element, selection: CursorSelection);
    getNodeKey?(appstate: AppState, node: Element, rootNode: Element): string;
    findClientNode?(app: AppState, serverNode: Element, nodeKey?: any): Element;
}

export interface AppState {
    opts: PrebootOptions;
    appRootName: string;
    freeze: any;           // only used if freeze option is passed in
    canComplete: boolean;      // set to false if preboot paused through an event
    completeCalled: boolean;    // set to true once the completion event has been raised
    started: boolean; 
    window?: any;
    document?: any;
    body?: any;
    appRoot?: any;
    serverRoot?: any;
    clientRoot?: any;
    activeNode?: any;               // copied from prebootref for strategies
    selection?: CursorSelection;    // copied from prebootref for strategies
    switched?: boolean;
}

export interface GlobalState {
  apps: [AppState]; 
}


// basically this is used to identify which events to listen for and what we do with them
export interface EventSelector {
  selector: string;                 // same as jQuery; selector for nodes
  events: [string];                 // array of event names to listen for
  keyCodes?: [number];              // key codes to watch out for
  preventDefault?: boolean;         // will prevent default handlers if true
  freeze?: boolean;                 // if  true, the UI will freeze when this event occurs
  action?: Function;                // custom action to take with this event
  noReplay?: boolean;               // if true, no replay will occur
}

export interface PrebootCompleteOptions {
  appRoot?: string;
  window?: Window;
  noCleanup?: boolean;
}

export interface ServerClientRoot {
  serverSelector: string;
  serverNode?: Element;
  clientSelector?: string;
  clientNode?: Element;
}

// interface for the options that can be passed into preboot
export interface PrebootOptions {
  window?: Window;                  // just used for testing purposes to mock out the window
  uglify?: boolean;                 // if true, client code generated will be uglified
  buffer?: boolean;                 // if true, attempt to buffer client rendering to hidden div
  noInlineCache?: boolean;          // if true, preboot_node will NOT cache generated inline code
  eventSelectors?: EventSelector[]; // when any of these events occur, they are recorded
  appRoot?: string | string[];      // define selectors for one or more server roots

  // an alternative for appRoot where you can define separate server and client root selectors
  serverClientRoot?: ServerClientRoot[];
}

// our wrapper around DOM events in preboot
export interface PrebootEvent {
  node: any;
  nodeKey?: any;
  event: DomEvent;
  name: string;
}

// an actual DOM event object
export interface DomEvent {
  which?: number;
  type?: string;
  target?: any;
  preventDefault();
}

// data on global preboot object for one particular app
export interface PrebootAppData {
  root: ServerClientRoot;
  events: PrebootEvent[];
}

// object that is used to keep track of all the preboot listeners (so we can remove the listeners later)
export interface PrebootEventListener {
  node: Element;
  eventName: string;
  handler: Function;
}

// object that contains all data about the currently active node in the DOM (i.e. that has focus)
export interface NodeContext {
  root: ServerClientRoot;
  node: Element;
  nodeKey?: string;
  selection?: {
    start: number,
    end: number,
    direction: string
  };
}

// interface for global object that contains all preboot data
export interface PrebootData {
  opts?: PrebootOptions;
  listening?: boolean;
  overlay?: Element;
  activeNode?: NodeContext;
  apps?: PrebootAppData[];
  listeners?: PrebootEventListener[];
}

export interface Selection {
  start: number;
  end: number;
  direction: string;
}

// global document object
export interface Document {
  body?: Element;
  readyState?: string;
  addEventListener?(name?: string, callback?: Function);
  querySelector?(selector?: string): Element;
  querySelectorAll?(selector?: string): Element[];
  createElement?(elementName?: string): Element;
}

export interface ComputedStyle {
  getPropertyValue(prop: string): string;
}

// interface for the global window object
export interface Window {
  prebootData: PrebootData;
  document: Document;
  getComputedStyle?(node: Element): ComputedStyle;
}

// this represents a node in the DOM
export interface Element {
  id?: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
  tagName?: string;
  nodeName?: string;
  className?: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: string;
  selection?: any;
  createTextRange?(): any;
  setSelectionRange?(fromPos: number, toPos: number, direction: string);
  style?: {
    display?: string;
  };
  parentNode?: Element;
  childNodes?: Element[];
  attributes?: string[];
  remove?();
  focus?();
  dispatchEvent?(event: DomEvent);
  getAttribute?(name: string): string;
  cloneNode?(deep?: boolean): Element;
  insertBefore?(nodeToInsert: Element, beforeNode: Element);
  addEventListener?(name: string, callback: Function);
  removeEventListener?(name: string, callback: Function);
  querySelector?(selector: string): Element;
  querySelectorAll?(selector: string): Element[];
  appendChild?(node: Element);
  setAttribute?(attrName: string, styles: string);
}

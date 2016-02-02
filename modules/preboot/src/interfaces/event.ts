// combo of a node and eventName used by listeners
export interface NodeEvent {
  node: any;
  eventName: string;
}

// our wrapper around DOM events in preboot
export interface PrebootEvent {
  node: any;
  nodeKey?: any;
  event: any;
  name: string;
  time?: number;
}

// an actual DOM event object
export interface DomEvent {
  which?: number;
  type?: string;
  target?: any;
  preventDefault();
}

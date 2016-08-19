// (was part of typings)
// Source: https://raw.githubusercontent.com/gdi2290/typed-xhr2/86ebfa644796b3a6553d22e62bb5e77fcae1eb8d/lib/xhr2.d.ts
declare module '~xhr2/lib/xhr2' {
var Element: {
  prototype: Element;
  new(): Element;
}

interface Event {
  bubbles: boolean;
  cancelBubble: boolean;
  cancelable: boolean;
  currentTarget: EventTarget;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  returnValue: boolean;
  srcElement: Element;
  target: EventTarget;
  timeStamp: number;
  type: string;
  initEvent(eventTypeArg: string, canBubbleArg: boolean, cancelableArg: boolean): void;
  preventDefault(): void;
  stopImmediatePropagation(): void;
  stopPropagation(): void;
  AT_TARGET: number;
  BUBBLING_PHASE: number;
  CAPTURING_PHASE: number;
}

var Event: {
  prototype: Event;
  new(type: string, eventInitDict?: EventInit): Event;
  AT_TARGET: number;
  BUBBLING_PHASE: number;
  CAPTURING_PHASE: number;
}

interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
}

interface EventListener {
  (evt: Event): void;
}

interface EventListenerObject {
  handleEvent(evt: Event): void;
}

interface ProgressEventInit extends EventInit {
  lengthComputable?: boolean;
  loaded?: number;
  total?: number;
}

interface ErrorEvent extends Event {
    colno: number;
    error: any;
    filename: string;
    lineno: number;
    message: string;
    initErrorEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, messageArg: string, filenameArg: string, linenoArg: number): void;
}

var ErrorEvent: {
    prototype: ErrorEvent;
    new(): ErrorEvent;
}


var ProgressEvent: {
  prototype: ProgressEvent;
  new(type: string, eventInitDict?: ProgressEventInit): ProgressEvent;
}

type EventListenerOrEventListenerObject = EventListener | EventListenerObject;

interface EventTarget {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
  dispatchEvent(evt: Event): boolean;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface XMLHttpRequestEventTarget {
  onabort: (ev: Event) => any;
  onerror: (ev: Event) => any;
  onload: (ev: Event) => any;
  onloadend: (ev: ProgressEvent) => any;
  onloadstart: (ev: Event) => any;
  onprogress: (ev: ProgressEvent) => any;
  ontimeout: (ev: ProgressEvent) => any;
  addEventListener(type: "abort", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "error", listener: (ev: ErrorEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "load", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "loadend", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "loadstart", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "progress", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "timeout", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface XMLHttpRequest extends EventTarget, XMLHttpRequestEventTarget {
  msCaching: string;
  onreadystatechange: (ev: ProgressEvent) => any;
  readyState: number;
  response: any;
  responseBody: any;
  responseText: string;
  responseType: string;
  responseXML: any;
  status: number;
  statusText: string;
  timeout: number;
  upload: XMLHttpRequestUpload;
  withCredentials: boolean;
  abort(): void;
  getAllResponseHeaders(): string;
  getResponseHeader(header: string): string;
  msCachingEnabled(): boolean;
  open(method: string, url: string, async?: boolean, user?: string, password?: string): void;
  overrideMimeType(mime: string): void;
  send(data?: string): void;
  send(data?: any): void;
  setRequestHeader(header: string, value: string): void;
  DONE: number;
  HEADERS_RECEIVED: number;
  LOADING: number;
  OPENED: number;
  UNSENT: number;
  addEventListener(type: "abort", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "error", listener: (ev: ErrorEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "load", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "loadend", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "loadstart", listener: (ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: "progress", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "readystatechange", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: "timeout", listener: (ev: ProgressEvent) => any, useCapture?: boolean): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
  nodejsSet(url: any): any;
  new(): XMLHttpRequest;
}

var XMLHttpRequest: {
  XMLHttpRequestUpload: XMLHttpRequestUpload;
  XMLHttpRequest: XMLHttpRequest;
  prototype: XMLHttpRequest;
  new(): XMLHttpRequest;
  DONE: number;
  HEADERS_RECEIVED: number;
  LOADING: number;
  OPENED: number;
  UNSENT: number;
  create(): XMLHttpRequest;
}

interface XMLHttpRequestUpload extends EventTarget, XMLHttpRequestEventTarget {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

var XMLHttpRequestUpload: {
  prototype: XMLHttpRequestUpload;
  new(): XMLHttpRequestUpload;
}

export = XMLHttpRequest;
}
declare module 'xhr2/lib/xhr2' {
import main = require('~xhr2/lib/xhr2');
export = main;
}
declare module 'xhr2' {
import main = require('~xhr2/lib/xhr2');
export = main;
}

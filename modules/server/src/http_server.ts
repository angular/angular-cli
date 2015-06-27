/// <reference path="../typings/tsd.d.ts" />

import {BrowserXHR} from 'angular2/src/http/backends/browser_xhr';
import {bind} from 'angular2/di';
import {
  MockBackend,
  XHRBackend,
  HttpFactory,
  BaseRequestOptions,
  Http
} from 'angular2/http';

function logging(type) {
  return function(...args) {
    console.log('logging ', type, ':', ...args);
  }
}

export class MockBrowserXHR {
  abort: any;
  send: any;
  open: any;
  addEventListener: any;
  removeEventListener: any;
  response: any;
  responseText: string;
  constructor() {
    this.abort = logging('about');
    this.send  = logging('send');
    this.open  = logging('open');
    this.addEventListener = logging('addEventListener');
    this.removeEventListener = logging('removeEventListener');
  }
}

export class NodeBackend extends MockBackend {
  constructor(req: any) {
    super(req);
  }
}

export var httpInjectables: Array<any> = [
  bind(BrowserXHR).toValue(MockBrowserXHR),
  bind(XHRBackend).toClass(NodeBackend),
  BaseRequestOptions,
  bind(HttpFactory).toFactory(HttpFactory, [XHRBackend, BaseRequestOptions]),
  Http
];

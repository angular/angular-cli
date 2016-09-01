import * as fs from 'fs';
import * as TsHoek from './ts-hoek';

export var HAPI_PLATFORM = null;

export var HAPI_ANGULAR_APP = {
  template: null,
  directives: null,
  providers: null
};

export function disposeHapiPlatform() {
  if (HAPI_PLATFORM && HAPI_PLATFORM.dispose) {
    HAPI_PLATFORM.dispose();
  }
  HAPI_PLATFORM = null;
}

export function disposeHapiAngularApp() {
  HAPI_ANGULAR_APP = {
    template: null,
    directives: null,
    providers: null
  };
}

class Runtime {
  constructor(private options: any) {
  }
  render(template: string, context, done: Function) {
    return '';
  }
}


export class hapiEngine {

  helpers: any;
  partials: any;

  constructor() {
    this.helpers = {};
    this.partials = {};
  }

  registerHelper(name, helper) {

  }

  registerPartial(name, partial) {

  }

  compile(template, options, next) {
    
  }

}

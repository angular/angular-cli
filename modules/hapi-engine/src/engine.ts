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

export class hapiEngine {

  helpers: any;
  partials: any;

  constructor() {
    this.helpers = {};
    this.partials = {};
  }

  registerHelper(_name, _helper) {

  }

  registerPartial(_name, _partial) {

  }

  compile(_template, _options, _next) {
    
  }

}

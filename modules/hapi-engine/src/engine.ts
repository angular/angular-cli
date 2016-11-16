export var HAPI_PLATFORM: any = null;

export var HAPI_ANGULAR_APP = {
  template: null as any,
  directives: null as any,
  providers: null as any
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

  registerHelper(_name: any, _helper: any) {

  }

  registerPartial(_name: any, _partial: any) {

  }

  compile(_template: any, _options: any, _next: any) {
    
  }

}

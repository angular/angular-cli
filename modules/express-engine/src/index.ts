const fs = require('graceful-fs');

import { platformUniversalDynamic, NodePlatformRef, parseDocument } from 'angular2-universal';
declare var Zone: any;
// @internal
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

export interface ExpressEngineConfig {
  document?: string;
  DOCUMENT?: string;
  cancelHandler?: () => boolean;
  CANCEL_HANDLER?: () => boolean;
  req?: any;
  REQ?: any;
  res?: any;
  RES?: any;
  time?: boolean;
  TIME?: boolean;
  id?: string;
  ID?: string;
  ngModule?: any;
  precompile?: boolean;
  cancel?: boolean;
  CANCEL?: boolean;
  requestUrl?: string;
  REQUEST_URL?: string;
  originUrl?: string;
  ORIGIN_URL?: string;
  baseUrl?: string;
  BASE_URL?: string;
  cookie?: string;
  COOKIE?: string;
}

export function createEngine(options?: any) {
  options = options || {};
  var cache = {
  };
  var _options = {
    precompile: true,
    time: false,
    asyncDestroy: true,
    id: () => s4(),
    platform: (providers) => platformUniversalDynamic(providers),
    providers: [],
    ngModule: null
  };
  _options.precompile = ('precompile' in options) ?  options.precompile : _options.precompile;
  _options.time = ('time' in options) ?  options.time : _options.time;
  _options.asyncDestroy = ('asyncDestroy' in options) ?  options.asyncDestroy : _options.asyncDestroy;
  _options.id = options.id || _options.id;
  _options.ngModule =  options.ngModule || _options.ngModule;
  var __platform = options.platform || _options.platform;
  var __providers = options.providers || _options.providers;
  delete _options.providers;
  delete _options.platform;

  const platformRef: any = __platform(__providers);
  var prom;
  if (_options.ngModule) {
    prom = platformRef.cacheModuleFactory(_options.ngModule)
  }

  return function expressEngine(filePath: string, data: ExpressEngineConfig = {ngModule: _options.ngModule}, done?: Function) {
    const ngModule = data.ngModule || _options.ngModule;
    if (!ngModule) {
      throw new Error('Please provide your main module as ngModule for example res.render("index", {ngModule: MainModule}) or in the engine as createEngine({ ngModule: MainModule })')
    }
    if (!data.req || !data.res) {
      throw new Error('Please provide the req, res arguments (request and response objects from express) in res.render("index", { req, res })');
    }
    var cancel = false;
    if (data.req) {
      data.req.on('close', () => cancel = true);
    }
    // defaults
    const _data = Object.assign({
      get cancel() { return cancel; },
      set cancel(val) { cancel = val; },

      get requestUrl() { return data.requestUrl || data.req.originalUrl },
      set requestUrl(val) {  },

      get originUrl() { return data.originUrl || data.req.hostname },
      set originUrl(val) {  },

      get baseUrl() { return data.baseUrl || '/' },
      set baseUrl(val) {  },

      get cookie() { return data.cookie || data.req.headers.cookie },
      set cookie(val) {  },
    }, data);

    function readContent(content) {
      const DOCUMENT: string = content.toString();
      // TODO(gdi2290): breaking change for context globals
      // _data.document = parseDocument(document);
      _data.document = DOCUMENT;
      _data.DOCUMENT = DOCUMENT;
      _data.cancelHandler = () => Zone.current.get('cancel');

      const zone = Zone.current.fork({
        name: 'UNIVERSAL request',
        properties: _data
      });



      // convert to string
      return zone.run(() => (_options.precompile ?
        platformRef.serializeModule(ngModule, _data) :
        platformRef.serializeModuleFactory(ngModule, _data)
      )
        .then(html => {
          if (typeof html !== 'string' || cancel) {
            return done(null, DOCUMENT);
          }
          done(null, html);
        })
        .catch(e => {
          console.log(e.stack);
          // if server fail then return client html
          done(null, DOCUMENT);
        }));
    }

    // read file on disk
    try {

      if (cache[filePath]) {
        return readContent(cache[filePath]);
      }
      fs.readFile(filePath, (err, content) => {
        if (err) {
          cancel = true;
          return done(err);
        }
        cache[filePath] = content;
        return readContent(content);
      });

    } catch (e) {
      cancel = true;
      done(e);
    }
  };
}

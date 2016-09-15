const fs = require('graceful-fs');

import { platformUniversalDynamic, NodePlatformRef } from 'angular2-universal';
declare var Zone: any;
// @internal
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

export interface ExpressEngineConfig {
  document?: string;
  cancelHandler?: () => boolean;
  req?: any;
  res?: any;
  time?: boolean;
  id?: string;
  ngModule?: any;
  precompile?: boolean;
  cancel?: boolean;
  requestUrl?: string;
  originUrl?: string;
  baseUrl?: string;
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
  var __platform = options.platform || _options.platform
  var __providers = options.providers || _options.providers;
  delete _options.providers;
  delete _options.platform;

  const platformRef: any = __platform(__providers);

  return function expressEngine(filePath: string, data: ExpressEngineConfig = {ngModule: _options.ngModule}, done?: Function) {
    const ngModule = data.ngModule || _options.ngModule;
    if (!ngModule) {
      throw new Error('Please provide your main module as ngModule for example res.render("index", {ngModule: MainModule}) or in the engine as createEngine({ ngModule: MainModule })')
    }
    if (!data.req || !data.res) {
      throw new Error('Please provide the req, res arguments (request and response objects from express) in res.render("index", { req, res })');
    }
    // defaults
    var cancel = false;
    const _data = Object.assign({
      get cancel() { return cancel; }
    }, data);

    function readContent(content) {
      const document: string = content.toString();
      _data.document = document;
      _data.cancelHandler = () => Zone.current.get('cancel')

      const zone = Zone.current.fork({
        name: 'UNIVERSAL request',
        properties: _data
      });

      var req: any = _data.req && _data.req.on && _data.req;
      if (req) {
        req.on('close', () => cancel = true);
        _data.requestUrl = _data.requestUrl || req.originalUrl;
        _data.originUrl = _data.originUrl || req.hostname;
        _data.baseUrl = _data.baseUrl || '/';
      }

      // convert to string
      return zone.run(() => (_options.precompile ?
        platformRef.serializeModule(ngModule, _data) :
        platformRef.serializeModuleFactory(ngModule, _data)
      )
        .then(html => {
          done(null, html);
        })
        .catch(e => {
          console.error(e.stack);
          // if server fail then return client html
          done(null, document);
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



const fs = require('graceful-fs');

import { platformUniversalDynamic, NodePlatformRef } from 'angular2-universal';

// @internal
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

export function createEngine(options) {
  var cache = {
  };
  var _options = {
    precompile: true,
    time: false,
    asyncDestroy: true,
    id: () => s4(),
    platform: (providers) => platformUniversalDynamic(providers),
    main: (config) => { throw new Error('Please provide a main function that returns ')},
    mainFactory: (config) => { throw new Error('Please provide a mainFactory function that returns ')},
    providers: []
  };
  _options.precompile = ('precompile' in options) ?  options.precompile : _options.precompile;
  _options.time = ('time' in options) ?  options.time : _options.time;
  _options.asyncDestroy = ('asyncDestroy' in options) ?  options.asyncDestroy : _options.asyncDestroy;
  _options.id = options.id || _options.id;
  _options.platform = options.platform || _options.platform
  _options.main = options.main || _options.main;
  _options.mainFactory = options.mainFactory || _options.mainFactory;
  _options.providers = options.providers || _options.providers;

  const platformRef: any = _options.platform(_options.providers);

  return function expressEngine(filePath: string, data: any = {}, done?: Function) {
    // defaults
    data = data || {};
    var cancel = false;
    const resConfig = Object.assign(data, {
      platformRef,
      cancelHandler: () => cancel,
      time: _options.time,
      asyncDestroy: _options.asyncDestroy,
      id: _options.id()
    });

    var req: any = (data.req && data.req.on && data.req) ||
    (data.request && data.request.on && data.request);

    req.on('close', () => cancel = true);


    function readContent(content) {
      const document: string = content.toString();
      resConfig.document = document;

      // convert to string

      return (_options.precompile ?
        platformRef.serializeModule(_options.main(resConfig), resConfig) :
        platformRef.serializeModuleFactory(_options.mainFactory(resConfig), resConfig)
      )
        .then(html => {
          done(null, html);
        })
        .catch(e => {
          console.error(e.stack);
          // if server fail then return client html
          done(null, document);
        });
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



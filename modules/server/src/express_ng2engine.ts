/// <reference path="../typings/tsd.d.ts" />
import './server_patch';
import * as fs from 'fs';
import {render} from './render';

import {
  prebootScript,
  angularScript,
  bootstrapButton,
  bootstrapFunction,
  bootstrapApp,
  buildClientScripts
} from './build_scripts';

export function ng2engine(filePath: string, options, done) {
  options.scripts = options.scripts || {};
  options.serverInjector = options.serverInjector || [];
  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {

      if (err) { return done(err); }
      var clientHtml = content.toString();
      if (options.server === false && options.client === false) {
        return done(null, clientHtml);
      }
      if (options.server === false && options.client !== false) {
        return done(null, buildClientScripts(clientHtml, options));
      }

      render(clientHtml, options.Component, options.serverInjector)
      .then(html => {
        var rendered = buildClientScripts(html, options);
        done(null, rendered);
      })
      .catch(e => done(e));
    });
  } catch (e) {
    done(e);
  }
};

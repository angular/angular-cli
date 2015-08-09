/// <reference path="../typings/tsd.d.ts" />
import './server_patch';
import * as fs from 'fs';
import {selectorRegExpFactory} from './helper';


import {renderToString, selectorResolver} from './render';

import {
  prebootScript,
  angularScript,
  bootstrapButton,
  bootstrapFunction,
  bootstrapApp,
  buildClientScripts
} from './build_scripts';

export function ng2engine(filePath: string, options, done) {
  // defaults
  options = options || {};
  options.serverBindings = options.serverBindings || [];

  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {

      if (err) { return done(err); }

      // convert to string
      var clientHtml = content.toString();

      // TODO: better build scripts abstraction
      if (options.server === false && options.client === false) {
        return done(null, clientHtml);
      }
      if (options.server === false && options.client !== false) {
        return done(null, buildClientScripts(clientHtml, options));
      }

      // bootstrap and render component to string
      renderToString(options.Component, options.serverBindings)
      .then(serializedCmp => {

        let selector = selectorResolver(options.Component);

        // selector replacer explained here
        // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
        // replace our component with serialized version
        let rendered = clientHtml.replace(
          // <selector></selector>
          selectorRegExpFactory(selector),
          // <selector>{{ serializedCmp }}</selector>
          serializedCmp
          // TODO: serializedData
        );

        done(null, buildClientScripts(rendered, options));
      })
      .catch(e => {
        // if server fail then return client html
        done(null, buildClientScripts(clientHtml, options));
      });
    });
  } catch (e) {
    done(e);
  }
};

export function simpleReplace(filePath: string, options, done) {
  // defaults
  options = options || {};

  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {

      if (err) { return done(err); }

      // convert to string
      var clientHtml = content.toString();

      // TODO: better build scripts abstraction
      if (options.server === false && options.client === false) {
        return done(null, clientHtml);
      }
      if (options.server === false && options.client !== false) {
        return done(null, buildClientScripts(clientHtml, options));
      }

      let rendered = clientHtml.replace(
        // <selector></selector>
        selectorRegExpFactory(options.selector),
        // <selector>{{ serializedCmp }}</selector>
        options.serializedCmp
      );

      done(null, buildClientScripts(rendered, options));
    });
  } catch (e) {
    done(e);
  }
}

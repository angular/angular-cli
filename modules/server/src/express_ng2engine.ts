/// <reference path="../typings/tsd.d.ts" />

import * as fs from 'fs';
import {render} from './render';

export function ng2engine(filePath: string, options, done) {
  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {
      if (err) {
        return done(err);
      }

      render(content, options.Component, options)
      .then(rendered => done(null, rendered))
      .catch(e => done(e));
    });
  } catch (e) {
    done(e);
  }
};

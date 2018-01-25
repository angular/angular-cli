/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { resolve } from '@angular-devkit/core/node';
import * as stream from 'stream';
import { packages } from '../lib/packages';

const npm = require(resolve('npm', { basedir: '/', checkGlobal: true }));

class NullStream extends stream.Writable {
  _write() {}
}


export default function (_: {}, logger: logging.Logger) {
  logger.info('Building...');
  const build = require('./build').default;
  build({}, logger.createChild('build'));

  return new Promise<void>((resolve, reject) => {
    const loadOptions = { progress: false, logstream: new NullStream() };
    npm.load(loadOptions, (err: Error | string) => err ? reject(err) : resolve());
  })
    .then(() => {
      return Object.keys(packages).reduce((acc: Promise<void>, name: string) => {
        const pkg = packages[name];
        if (pkg.packageJson['private']) {
          logger.debug(`${name} (private)`);

          return acc;
        }

        return acc
          .then(() => new Promise<void>((resolve, reject) => {
            logger.info(name);
            process.chdir(pkg.dist);
            npm.commands['publish']([], (err: Error) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }))
          .catch((err: Error) => {
            logger.error(err.message);
          });
      }, Promise.resolve());
    })
    .then(() => logger.info('done'), (err: Error) => logger.fatal(err.message));
}

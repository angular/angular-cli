import * as Q from 'q';
import uglify = require('gulp-uglify');
import insert = require('gulp-insert');
import rename = require('gulp-rename');
import eventStream = require('event-stream');
import buffer = require('vinyl-buffer');
import source = require('vinyl-source-stream');
import * as browserify from 'browserify';
import {normalize, listenStrategies, replayStrategies, freezeStrategies} from './normalize';
import {stringifyWithFunctions} from './utils';
import {PrebootOptions} from '../interfaces/preboot_options';

// map of input opts to browser code; exposed for testing purposes
export let browserCodeCache = {};

/**
 * We want to use the browserify ignore functionality so that any code modules
 * that are not being used are stubbed out. So, for example, if in the preboot
 * options the only listen strategy is selectors, then the event_bindings and
 * attributes strategies will be stubbed out (meaing the refs will be {})
 */
export function ignoreUnusedStrategies(b: BrowserifyObject, bOpts: Object, strategyOpts: any[], allStrategies: Object, pathPrefix: string) {
  let activeStrategies = strategyOpts
    .filter(x => x.name)
    .map(x => x.name);

  Object.keys(allStrategies)
    .filter(x => activeStrategies.indexOf(x) < 0)
    .forEach(x => b.ignore(pathPrefix + x + '.js', bOpts));
}

/**
 * Generate browser code as a readable stream for preboot based on the input options
 */
export function getClientCodeStream(opts?: PrebootOptions): NodeJS.ReadableStream {
  opts = normalize(opts);

  let bOpts = {
    entries: [__dirname + '/../browser/preboot_browser.js'],
    standalone: 'preboot',
    basedir: __dirname + '/../browser',
    browserField: false
  };
  let b = browserify(bOpts);

  // ignore any strategies that are not being used
  ignoreUnusedStrategies(b, bOpts, opts.listen, listenStrategies, './listen/listen_by_');
  ignoreUnusedStrategies(b, bOpts, opts.replay, replayStrategies, './replay/replay_after_');

  if (opts.freeze) {
    ignoreUnusedStrategies(b, bOpts, [opts.freeze], freezeStrategies, './freeze/freeze_with_');
  }

  // ignore other code not being used
  if (!opts.buffer) { b.ignore('./buffer_manager.js', bOpts); }
  if (!opts.debug) { b.ignore('./log.js', bOpts); }

  // use gulp to get the stream with the custom preboot browser code
  let outputStream = b.bundle()
    .pipe(source('src/browser/preboot_browser.js'))
    .pipe(buffer())
    .pipe(insert.append('\n\n;preboot.init(' + stringifyWithFunctions(opts) + ');\n\n'))
    .pipe(rename('preboot.js'));

  // uglify if the option is passed in
  return opts.uglify ? outputStream.pipe(uglify()) : outputStream;
}

/**
 * Generate browser code as a string for preboot
 * based on the input options
 */
export function getClientCode(opts?: PrebootOptions, done?: Function): any {
  let deferred = Q.defer();
  let clientCode = '';

  // check cache first
  let cacheKey = JSON.stringify(opts);
  if (browserCodeCache[cacheKey]) {
    return Q.when(browserCodeCache[cacheKey]);
  }

  // get the browser code
  getClientCodeStream(opts)
    .pipe(eventStream.map(function(file, cb) {
      clientCode += file.contents;
      cb(null, file);
    }))
    .on('error', function(err) {
      if (done) {
        done(err);
      }

      deferred.reject(err);
    })
    .on('end', function() {
      if (done) {
        done(null, clientCode);
      }

      browserCodeCache[cacheKey] = clientCode;
      deferred.resolve(clientCode);
    });

  return deferred.promise;
}

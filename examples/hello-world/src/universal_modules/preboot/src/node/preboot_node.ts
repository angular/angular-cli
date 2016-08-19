import { PrebootOptions } from '../preboot_interfaces';
import { prebootstrap } from '../inline/preboot_inline';
import fs = require('fs');
import path = require('path');

let inlineCodeCache = {};

// exporting default options in case developer wants to use these + custom on top
export const defaultOptions = <PrebootOptions> {
  buffer: true,

  // these are the default events are are listening for an transfering from server view to client view
  eventSelectors: [

    // for recording changes in form elements
    { selector: 'input,textarea', events: ['keypress', 'keyup', 'keydown', 'input', 'change'] },
    { selector: 'select,option', events: ['change'] },

    // when user hits return button in an input box
    { selector: 'input', events: ['keyup'], preventDefault: true, keyCodes: [13], freeze: true },

    // for tracking focus (no need to replay)
    { selector: 'input,textarea', events: ['focusin', 'focusout', 'mousedown', 'mouseup'], noReplay: true },

    // user clicks on a button
    { selector: 'input[type="submit"],button', events: ['click'], preventDefault: true, freeze: true }
  ]
};

/**
 * Main entry point for the server side version of preboot. The main purpose
 * is to generate inline code that can be inserted into the server view.
 *
 * @param customOptions PrebootOptions that override the defaults
 * @returns {string} Generated inline preboot code is returned
 */
export function getInlineCode(customOptions?: PrebootOptions): string {
  let opts = <PrebootOptions> assign({}, defaultOptions, customOptions);

  // safety check to make sure options passed in are valid
  validateOptions(opts);

  // as long as we inline code caching isn't disabled and exists in cache, use the cache
  let optsKey = JSON.stringify(opts);
  if (!opts.noInlineCache && inlineCodeCache[optsKey]) {
    return inlineCodeCache[optsKey];
  }

  // two different possibilities depending on how client is calling preboot_node
  var minCodePath1 = path.normalize(__dirname + '/preboot_inline.min.js');
  var minCodePath2 = path.normalize(__dirname + '/../../preboot_inline.min.js');
  var inlineCode;

  if (opts.uglify) {
    if (fs.existsSync(minCodePath1)) {
      inlineCode = fs.readFileSync(minCodePath1).toString();
    } else if (fs.existsSync(minCodePath2)) {
      inlineCode = fs.readFileSync(minCodePath2).toString();
    } else {
      console.warn('Unable to use uglified version of inline preboot. ' +
        'The /dist/preboot_inline.min.js file is missing from this library. ' +
        'Using non-uglified version for now.');
      inlineCode = prebootstrap.toString();
    }
  } else {
    inlineCode = prebootstrap.toString();
  }

  // generate the inline JavaScript from prebootstrap
  inlineCode += '\n ' + 'prebootstrap().init(' + stringifyWithFunctions(opts) + ');';

  // cache results as long as caching not disabled
  if (!opts.noInlineCache) {
    inlineCodeCache[optsKey] = inlineCode;
  }

  return inlineCode;
}

/**
 * Throw an error if issues with any options
 * @param opts
 */
function validateOptions(opts: PrebootOptions) {
  if ( (!opts.appRoot || !opts.appRoot.length) &&
    (!opts.serverClientRoot || !opts.serverClientRoot.length)) {

    throw new Error('The appRoot is missing from preboot options. ' +
      'This is needed to find the root of your application. ' +
      'Set this value in the preboot options to be a selector for the root element of your app.');
  }
}

/**
 * For some reason, Object.assign() is not fully supporting in TypeScript, so
 * this is just a simple implementation of it
 *
 * @param target The target object
 * @param optionSets Any number of addition objects that are added on top of the target
 * @returns {Object} A new object that contains all the merged values
 */
export function assign(target: Object, ...optionSets): Object {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var output = Object(target);
  for (let index = 0; index < optionSets.length; index++) {
    var source = optionSets[index];
    if (source !== undefined && source !== null) {
      for (let nextKey in source) {
        if (source.hasOwnProperty(nextKey)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
  }

  return output;
}

/**
 * Stringify an object and include functions. This is needed since we are letting
 * users pass in options that include custom functions for things like the
 * freeze handler or action when an event occurs
 *
 * @param obj This is the object you want to stringify that includes some functions
 * @returns {string} The stringified version of an object
 */
export function stringifyWithFunctions(obj: Object): string {
  const FUNC_START = 'START_FUNCTION_HERE';
  const FUNC_STOP = 'STOP_FUNCTION_HERE';

  // first stringify except mark off functions with markers
  let str = JSON.stringify(obj, function (key, value) {

    // if the value is a function, we want to wrap it with markers
    if (!!(value && value.constructor && value.call && value.apply)) {
      return FUNC_START + value.toString() + FUNC_STOP;
    } else {
      return value;
    }
  });

  // now we use the markers to replace function strings with actual functions
  let startFuncIdx = str.indexOf(FUNC_START);
  let stopFuncIdx, fn;
  while (startFuncIdx >= 0) {
    stopFuncIdx = str.indexOf(FUNC_STOP);

    // pull string out
    fn = str.substring(startFuncIdx + FUNC_START.length, stopFuncIdx);
    fn = fn.replace(/\\n/g, '\n');

    str = str.substring(0, startFuncIdx - 1) + fn + str.substring(stopFuncIdx + FUNC_STOP.length + 1);
    startFuncIdx = str.indexOf(FUNC_START);
  }

  return str;
}

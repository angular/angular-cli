/**
 * this module is used to take input from the user on the server side
 * for the preboot options they want and to standarize those options
 * into a specific format that is known by the browser code.
 */
import * as _ from 'lodash';
import presetFns from './presets';
import {PrebootOptions} from '../interfaces/preboot_options';

// these are the current pre-built strategies that are available
export const listenStrategies = { attributes: true, event_bindings: true, selectors: true };
export const replayStrategies = { hydrate: true, rerender: true };
export const freezeStrategies = { spinner: true };

// this is just exposed for testing purposes
export let defaultFreezeStyles = {
  overlay: {
    className:    'preboot-overlay',
    style: {
      position:   'absolute',
      display:    'none',
      zIndex:     '9999999',
      top:        '0',
      left:       '0',
      width:      '100%',
      height:     '100%'
    }
  },
  spinner: {
    className:    'preboot-spinner',
    style: {
      position:   'absolute',
      display:    'none',
      zIndex:     '99999999'
    }
  }
};

// this object contains functions for each PrebootOptions value to validate it
// and prep it for call to generate browser code
export let normalizers = {

  /**
   * Just set default pauseEvent if doesn't exist
   */
  pauseEvent: (opts: PrebootOptions) => {
    opts.pauseEvent = opts.pauseEvent || 'PrebootPause';
  },

  /**
   * Set default resumeEvent if doesn't exist
   */
  resumeEvent: (opts: PrebootOptions) => {
    opts.resumeEvent = opts.resumeEvent || 'PrebootResume';
  },

  completeEvent: (opts: PrebootOptions) => {
    opts.completeEvent = opts.completeEvent || 'BootstrapComplete';
  },

  /**
   * Make sure that the listen option is an array of ListenStrategy
   * objects so client side doesn't need to worry about conversions
   */
  listen: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];

    // if listen strategies are strings turn them into arrays
    if (typeof opts.listen === 'string') {
      if (!listenStrategies[opts.listen]) {
        throw new Error('Invalid listen strategy: ' + opts.listen);
      } else {
        opts.listen = [{ name: opts.listen }];
      }
    } else if (!Array.isArray(opts.listen)) {
      opts.listen = [opts.listen];
    }

    // loop through strategies and convert strings to objects
    opts.listen = opts.listen.map(function (val) {
      let strategy = (typeof val === 'string') ? { name: val } : val;

      if (strategy.name && !listenStrategies[strategy.name]) {
        throw new Error('Invalid listen strategy: ' + strategy.name);
      } else if (!strategy.name && !strategy.getNodeEvents) {
        throw new Error('Every listen strategy must either have a valid name or implement getNodeEvents()');
      }

      return strategy;
    });
  },

  /**
   * Make sure replay options are array of ReplayStrategy objects.
   * So, callers can just pass in simple string, but converted to
   * an array before passed into client side preboot.
   */
  replay: function (opts: PrebootOptions) {
    opts.replay = opts.replay || [{ name: 'rerender' }];  // default

    // if replay strategies are strings turn them into arrays
    if (typeof opts.replay === 'string') {
      if (!replayStrategies[opts.replay]) {
        throw new Error('Invalid replay strategy: ' + opts.replay);
      } else {
        opts.replay = [{ name: opts.replay }];
      }
    } else if (!Array.isArray(opts.replay)) {
      opts.replay = [opts.replay];
    }

    // loop through array and convert strings to objects
    opts.replay = opts.replay.map(function (val) {
      let strategy = (typeof val === 'string') ? { name: val } : val;

      if (strategy.name && !replayStrategies[strategy.name]) {
        throw new Error('Invalid replay strategy: ' + strategy.name);
      } else if (!strategy.name && !strategy.replayEvents) {
        throw new Error('Every replay strategy must either have a valid name or implement replayEvents()');
      }

      return strategy;
    });
  },

  /**
   * Make sure freeze options are array of FreezeStrategy objects.
   * We have a set of base styles that are used for freeze (i.e. for
   * overaly and spinner), but these can be overriden
   */
  freeze: function (opts: PrebootOptions) {

    // if no freeze option, don't do anything
    if (!opts.freeze) { return ; }

    let freezeName = opts.freeze.name || opts.freeze;
    let isFreezeNameString = (typeof freezeName === 'string');

    // if freeze strategy doesn't exist, throw error
    if (isFreezeNameString && !freezeStrategies[freezeName]) {
      throw new Error('Invalid freeze option: ' + freezeName);
    } else if (!isFreezeNameString && (!opts.freeze.prep || !opts.freeze.cleanup)) {
      throw new Error('Freeze must have name or prep and cleanup functions');
    }

    // if string convert to object
    if (typeof opts.freeze === 'string') {
      opts.freeze = { name: opts.freeze };
    }

    // set default freeze values
    opts.freeze.styles = _.merge(defaultFreezeStyles, opts.freeze.styles);
    opts.freeze.eventName = opts.freeze.eventName || 'PrebootFreeze';
    opts.freeze.timeout = opts.freeze.timeout || 5000;
    opts.freeze.doBlur = opts.freeze.doBlur === undefined ? true : opts.freeze.doBlur;
  },

  /**
   * Presets are modifications to options. In the future,
   * we may be simple presets like 'angular' which add
   * all the listeners and replay.
   */
  presets: function (opts: PrebootOptions) {
    let presetOptions = opts.presets;
    let presetName;

    // don't do anything if no presets
    if (!opts.presets) { return; }

    if (!Array.isArray(opts.presets)) {
      throw new Error('presets must be an array of strings');
    }

    for (var i = 0; i < presetOptions.length; i++) {
      presetName = presetOptions[i];

      if (!(typeof presetName === 'string')) {
        throw new Error('presets must be an array of strings');
      }

      if (presetFns[presetName]) {
        presetFns[presetName](opts);
      } else {
        throw new Error('Invalid preset: ' + presetName);
      }
    }
  }
};

/**
 * Normalize options so user can enter shorthand and it is
 * expanded as appropriate for the browser code
 */
export function normalize(opts: PrebootOptions): PrebootOptions {
  opts = opts || {};

  for (let key in normalizers) {
    if (normalizers.hasOwnProperty(key)) {
      normalizers[key](opts);
    }
  }

  // if no listen strategies, there is an issue because nothing will happen
  if (!opts.listen || !opts.listen.length) {
    throw new Error('Not listening for any events. Preboot not going to do anything.');
  }

  return opts;
}

/**
 * This is the main entry point for preboot on the browser.
 * The primary methods are: 
 *    init() - called automatically to initialize preboot according to options
 *    start() - when preboot should start listening to events
 *    done() - when preboot should start replaying events
 */

import * as eventManager from './event_manager';
import * as bufferManager from './buffer_manager';
import * as logManager from './log';
import * as freezeSpin from './freeze/freeze_with_spinner';
import *  as app from './app_manager';
import { Element } from '../interfaces/element';
import { PrebootOptions } from '../interfaces/preboot_options';
import { PrebootState } from './preboot_state';
import { AppState } from '../interfaces/app';

let state = PrebootState;

/**
 * Once bootstrap has completed, we replay events,
 * switch buffer and then cleanup
 */
export function complete(appName: string) {
  if (appName !== undefined) { 
    completeApp(app.getApp(appName)); 
  } else { 
    state.apps.forEach(appstate => { completeApp(appstate); }); 
  }
}

function completeApp(appstate: AppState) {
  // preboot.log(2, eventManager.state.events);
    appstate.completeCalled = true; 
    if (appstate.canComplete) {
      eventManager.replayEvents(app, appstate);                 // replay events on browser DOM
  
      if (appstate.opts.buffer) { bufferManager.switchBuffer(app, appstate); } // switch from server to browser buffer
      if (appstate.opts.freeze) { appstate.freeze.cleanup(app, appstate); }       // cleanup freeze divs like overlay
      eventManager.cleanup(app, appstate);                            // cleanup event listeners
    }
}

/**
 * Get function to run once window has loaded
 */
function load(appName: string) {
  if (appName !== undefined) { 
    loadApp(app.getApp(appName)); 
  } else { 
    state.apps.forEach(appstate => { loadApp(appstate); }); 
  }
}

function loadApp(appstate: AppState) {
   // re-initialize each approot now that we have the body
  // grab the root element
  // var root = dom.getDocumentNode(opts.appRoot);
  // make sure the app root is set
  var root = app.getDocumentNode(appstate);
  app.initAppRoot(appstate, {window: window});
  app.updateAppRoots(appstate, root, root, root);

  // if we are buffering, need to switch around the divs
  if (appstate.opts.buffer) { bufferManager.prep(app, appstate); }

  // if we could potentially freeze the UI, we need to prep (i.e. to add divs for overlay, etc.)
  // note: will need to alter this logic when we have more than one freeze strategy
  if (appstate.opts.freeze) {
      appstate.freeze = appstate.opts.freeze.name === 'spinner' ? freezeSpin : appstate.opts.freeze;
      appstate.freeze.prep(app, appstate);

      // start listening to events
      eventManager.startListening(app, appstate);
  }    
}

/**
 * Resume the completion process; if complete already called,
 * call it again right away
 */
function resume(appName: string) {
   if (appName !== undefined) { 
     resumeApp(app.getApp(appName));
  } else { 
    state.apps.forEach(appstate => {
       resumeApp(appstate);
    });
  }
}

function resumeApp(appstate: AppState) {
   appstate.canComplete = true; 
      if (appstate.completeCalled) {
        // using setTimeout to fix weird bug where err thrown on
        // serverRoot.remove() in buffer switch
         setTimeout(() => { complete(appstate.appRootName); }, 10);
      }
}

/**
 * Initialization is really simple. Just save the options and set
 * the window object. Most stuff happens with start()
 * *
 * To call multiple times like init('app1', {}), init('app2', {})
 */
export function init(appName: string, opts: PrebootOptions) {
   var appstate = app.addApp(appName, opts);
   app.initAppRoot(appstate, {window: window});  
}

/**
 * Start preboot by starting to record events
 */
export function start(appName?: string) {
  // let opts = state.opts;
  if (appName !== undefined) {
     startApp(app.getApp(appName)); 
  } else { 
    state.apps.forEach(app => { startApp(app); });
  }
}

function startApp(appstate: AppState) {
   // we can only start once, so don't do anything if called multiple times
   // if (appstate.started) { return }
   
   app.initAppRoot(appstate, {window: window});
  
   app.onLoad(appstate, load);
   app.on(appstate, appstate.opts.pauseEvent, () => appstate.canComplete = false);
   app.on(appstate, appstate.opts.resumeEvent, resume);
   app.on(appstate, appstate.opts.completeEvent, complete);  
}

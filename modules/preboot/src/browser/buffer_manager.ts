/**
 * The purpose of this module is to manage the buffering of client rendered
 * HTML to a hidden div. After the client is fully bootstrapped, this module
 * would then be used to switch the hidden client div and the visible server div.
 * Note that this technique would only work if the app root is somewhere within
 * the body tag in the HTML document.
 */
import {App, AppState} from '../interfaces/app';

// expose state for testing purposes
export let state = { switched: false };

/**
 * Create a second div that will be the client root for an app
 */
export function prep(app: App, appstate: AppState) {

  // server root is the app root when we get started
  let serverRoot = appstate.appRoot;

  // client root is going to be a shallow clone of the server root
  let clientRoot = serverRoot.cloneNode(false);

  // client in the DOM, but not displayed until time for switch
  clientRoot.style.display = 'none';

  // insert the client root right before the server root
  serverRoot.parentNode.insertBefore(clientRoot, serverRoot);

  // update the dom manager to store the server and client roots (first param is appRoot)
  app.updateAppRoots(appstate, serverRoot, serverRoot, clientRoot);
}

/**
 * We want to simultaneously remove the server node from the DOM
 * and display the client node
 */
export function switchBuffer(app: App, appState: AppState) {
  

  // get refs to the roots
  let clientRoot = appState.clientRoot || appState.appRoot;
  let serverRoot = appState.serverRoot || appState.appRoot;

  // don't do anything if already switched
  if (appState.switched) { return; }

  // remove the server root if not same as client and not the body
  if (serverRoot !== clientRoot && serverRoot.nodeName !== 'BODY') {
    app.removeNode(serverRoot);
  }

  // display the client
  clientRoot.style.display = 'block';

  // update the roots; first param is the new appRoot; serverRoot now null
   app.updateAppRoots(appState, clientRoot, null, clientRoot);

  // finally mark state as switched
  appState.switched = true;
}

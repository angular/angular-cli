/**
 * This is the entry point for the client side preboot library. At a high level, this library
 * is used to facilitate the switch from the server view to the client view. Specifically that
 * means:
 *
 *    1. Replay stored server view events on client view
 *    2. Switch buffer from server view to client view
 *    3. Reset focus on client view
 */

// NOTE: since we are not using webpack or any other external packaging client, this module
// contains everything. So, don't import anything other than interfaces
import {
  PrebootCompleteOptions,
  PrebootAppData,
  PrebootData,
  PrebootEvent,
  NodeContext,
  Element,
  Window
} from '../preboot_interfaces';

// the idea here is that preboot is a global value on the window that is used by the client
var preboot = prebootClient();

// wrapper function used to contain all the preboot client functionality
export function prebootClient() {

  // used to cache map from server node key to associated client node
  let clientNodeCache = {};

  /**
   * External code call this to kick off the switch from server to client
   */
  function complete(opts?: PrebootCompleteOptions) {
    opts = opts || {};

    let theWindow = <Window> (opts.window || window);
    let prebootData = theWindow.prebootData || {};

    // make sure preboot no longer listening for new events
    prebootData.listening = false;

    // loop through each of the preboot apps
    prebootData.apps.forEach(function (appData) {
      let root = appData.root;

      // if a specific app root set and it doesn't equal the server selector, then don't do anything
      if (opts.appRoot && opts.appRoot !== root.serverSelector) {
        return;
      }

      // some client side frameworks (like Angular 1 w UI Router) will replace
      // elements, so we need to re-get client root just to be safe
      root.clientNode = theWindow.document.querySelector(root.clientSelector);

      // replay all the events from the server view onto the client view
      appData.events.forEach(event => replayEvent(appData, event));

      // if we are buffering, switch the buffers
      switchBuffer(theWindow, appData);
    });

    // once all events have been replayed and buffers switched, then we cleanup preboot
    if (!opts.noCleanup) {
      cleanup(theWindow, prebootData);
    }
  }

  /**
   * Replay a particular event. The trick here is finding the appropriate client
   * node where the event is to be dispatched that matches up with the server node
   * where the event came from originally.
   */
  function replayEvent(appData: PrebootAppData, prebootEvent: PrebootEvent) {
    let event = prebootEvent.event;
    let serverNode = prebootEvent.node;
    let nodeKey = prebootEvent.nodeKey;
    let clientNode = findClientNode({
      root: appData.root,
      node: serverNode,
      nodeKey: nodeKey
    });

    // if client node can't be found, log a warning
    if (!clientNode) {
      console.warn('Trying to dispatch event ' + event.type +
        ' to node ' + nodeKey + ' but could not find client node. ' +
        'Server node is: ');
      console.log(serverNode);
      return;
    }

    // now dispatch events and whatnot to the client node
    clientNode.checked = serverNode.checked ? true : undefined;
    clientNode.selected = serverNode.selected ? true : undefined;
    clientNode.value = serverNode.value;
    clientNode.dispatchEvent(event);
  }

  /**
   * Hide the server buffer and show the client buffer
   */
  function switchBuffer(window: Window, appData: PrebootAppData) {
    let root = appData.root;
    let serverView = root.serverNode;
    let clientView = root.clientNode;

    // if the server view is the body or client and server view are the same,
    // then don't do anything and return
    if (serverView === clientView || serverView.nodeName === 'BODY') {
      return;
    }

    // get the server view display mode
    let display = window
        .getComputedStyle(serverView)
        .getPropertyValue('display') || 'block';

    // first remove the server view
    serverView.remove ?
      serverView.remove() :
      serverView.style.display = 'none';

    // now add the client view
    clientView.style.display = display;
  }

  /**
   * This function does three things to cleanup preboot:
   *    1. Set focus (and selection if a text box/text area) within a form element
   *    2. Remove existing event listeners
   *    3. Delete data from memory
   */
  function cleanup(window: Window, prebootData: PrebootData) {
    prebootData = prebootData || {};

    // set focus on the active node AFTER a small delay to ensure buffer switched
    setTimeout(function () {
      setFocus(prebootData.activeNode);
    }, 1);

    // remove all event listeners
    for (let listener of prebootData.listeners) {
      listener.node.removeEventListener(listener.eventName, listener.handler);
    }

    // remove the freeze overlay if it exists
    let prebootOverlay = window.document.body.querySelector('#prebootOverlay');
    if (prebootOverlay) {
      prebootOverlay.style.display = 'none';
    }

    // finally clear out the data stored for each app
    prebootData.apps = [];
    clientNodeCache = {};
  }

  /**
   * Set focus on a given active node element
   */
  function setFocus(activeNode: NodeContext) {

    // only do something if there is an active node
    if (!activeNode || !activeNode.node || !activeNode.nodeKey) {
      return;
    }

    // find the client node in the new client view
    let clientNode = findClientNode(activeNode);
    if (clientNode) {

      // set focus on the client node
      clientNode.focus();

      // set selection if a modern browser (i.e. IE9+, etc.)
      let selection = activeNode.selection;
      if (clientNode.setSelectionRange && selection) {
        clientNode.setSelectionRange(selection.start, selection.end, selection.direction);
      }
    }
  }

  /**
   * Given a node from the server rendered view, find the equivalent
   * node in the client rendered view. We do this by the following approach:
   *      1. take the name of the server node tag (ex. div or h1 or input)
   *      2. add either id (ex. div#myid) or class names (ex. div.class1.class2)
   *      3. use that value as a selector to get all the matching client nodes
   *      4. loop through all client nodes found and for each generate a key value
   *      5. compare the client key to the server key; once there is a match, we have our client node
   *
   * NOTE: this only works when the client view is almost exactly the same as the server
   * view. we will need an improvement here in the future to account for situations
   * where the client view is different in structure from the server view
   */
  function findClientNode(serverNodeContext: NodeContext): Element {

    // if nothing passed in, then no client node
    if (!serverNodeContext) { return null; }

    // we use the string of the node to compare to the client node & as key in cache
    let serverNodeKey = serverNodeContext.nodeKey || getNodeKey(serverNodeContext);

    // if client node already in cache, return it
    if (clientNodeCache[serverNodeKey]) {
      return clientNodeCache[serverNodeKey];
    }

    // get the selector for client nodes
    let serverNode = serverNodeContext.node;
    let className = (serverNode.className || '').replace('ng-binding', '').trim();
    let selector = serverNode.tagName;

    if (serverNode.id) {
      selector += '#' + serverNode.id;
    } else if (className) {
      selector += '.' + className.replace(/ /g, '.');
    }

    // select all possible client nodes and look through them to try and find a match
    let root = serverNodeContext.root;
    let rootClientNode = root.clientNode;
    let clientNodes = rootClientNode.querySelectorAll(selector);
    for (let clientNode of clientNodes) {

      // get the key for the client node
      let clientNodeKey = getNodeKey({ root: root, node: clientNode });

      // if the client node key is exact match for the server node key, then we found the client node
      if (clientNodeKey === serverNodeKey) {
        clientNodeCache[serverNodeKey] = clientNode;
        return clientNode;
      }
    }

    // if we get here and there is one clientNode, use it as a fallback
    if (clientNodes.length === 1) {
      clientNodeCache[serverNodeKey] = clientNodes[0];
      return clientNodes[0];
    }

    // if we get here it means we couldn't find the client node so give the user a warning
    console.warn('No matching client node found for ' + serverNodeKey +
      '. You can fix this by assigning this element a unique id attribute.');
    return null;
  }

  /**
   * Attempt to generate key from node position in the DOM
   *
   * NOTE: this function is duplicated in preboot_inline.ts and must be
   * kept in sync. It is duplicated for right now since we are trying
   * to keep all inline code separated and distinct (i.e. without imports)
   */
  function getNodeKey(nodeContext: NodeContext): string {
    let ancestors = [];
    let root = nodeContext.root;
    let node = nodeContext.node;
    let temp = node;

    // walk up the tree from the target node up to the root
    while (temp && temp !== root.serverNode && temp !== root.clientNode) {
      ancestors.push(temp);
      temp = temp.parentNode;
    }

    // note: if temp doesn't exist here it means root node wasn't found
    if (temp) {
      ancestors.push(temp);
    }

    // now go backwards starting from the root, appending the appName to unique identify the node later..
    let name = node.nodeName || 'unknown';
    let key = name + '_' + root.serverSelector;
    let len = ancestors.length;

    for (let i = (len - 1); i >= 0; i--) {
      temp = ancestors[i];

      if (temp.childNodes && i > 0) {
        for (let j = 0; j < temp.childNodes.length; j++) {
          if (temp.childNodes[j] === ancestors[i - 1]) {
            key += '_s' + (j + 1);
            break;
          }
        }
      }
    }

    return key;
  }

  return {
    complete: complete,
    replayEvent: replayEvent,
    switchBuffer: switchBuffer,
    cleanup: cleanup,
    setFocus: setFocus,
    findClientNode: findClientNode,
    getNodeKey: getNodeKey
  };
}

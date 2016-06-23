/**
 * This is the entire inline JavaScript used for preboot. The way it works is that
 * the server side library for preboot calls toString() on the prebootstrap() function
 * and then injects the resulting JavaScript directly into the server view.
 *
 * As a result, all the code must be within the one prebootstrap() function and it
 * can't use any external dependencies other than interfaces.
 *
 * The final result of this code is to have a global object called prebootData which
 * hangs off the window and can be accessed by the preboot client code to replay
 * events, switch buffers and facilitate the switch from server view to client view.
 */

// NOTE: since we inline the prebootstrap function, only import interfaces!!!
import {
  EventSelector,
  PrebootOptions,
  PrebootAppData,
  PrebootData,
  Element,
  DomEvent,
  NodeContext,
  Window,
  Document,
  Selection,
  ServerClientRoot
} from '../preboot_interfaces';

/**
 * The purpose of this wrapper function is simply to have an easy way for the preboot node
 * library to generate the inline code without any downstream deps (like webpack). Basically,
 * the node library get this JavaScript by calling prebootstrap.toString() then it adds
 *
 * prebootstrap().init(opts);
 */
export function prebootstrap() {

  var CARET_EVENTS = ['keyup', 'keydown', 'focusin', 'mouseup', 'mousedown'];
  var CARET_NODES = ['INPUT', 'TEXTAREA'];

  /**
   * Called right away to initialize preboot
   *
   * @param opts All the preboot options
   */
  function init(opts: PrebootOptions) {

    // we allow for window to be passed in so we can unit test on the server side
    let theWindow = <Window> (opts.window || window);
    let document = <Document> (theWindow.document || {});

    // add the preboot options to the preboot data and then add the data to
    // the window so it can be used later by the client
    let data = theWindow.prebootData = <PrebootData> {
      opts: opts,
      listening: true,
      apps: [],
      listeners: []
    };

    // in most cases we wait until DOMContentLoaded, but if the document is ready, start NOW!
    if (document.readyState === 'interactive') {
      start(document, data);
    } else {
      document.addEventListener('DOMContentLoaded', () => start(document, data));
    }
  }

  /**
   * Start up preboot by going through each app and assigning the appropriate handlers
   *
   * @param document Global document object passed in for testing purposes
   * @param prebootData Global preboot data object that contains options and will have events
   */
  function start(document: Document, prebootData: PrebootData) {
    let opts = prebootData.opts || {};
    let eventSelectors = opts.eventSelectors || [];

    // create an overlay that can be used later if a freeze event occurs
    prebootData.overlay = createOverlay(document);

    // get an array of all the root info
    let appRoots = getAppRoots(document, prebootData.opts);

    // for each app root
    appRoots.forEach(function (root) {

      // we track all events for each app in the prebootData object which is on the global scope
      let appData = <PrebootAppData> { root: root, events: [] };
      prebootData.apps.push(appData);

      // loop through all the eventSelectors and create event handlers
      eventSelectors.forEach(eventSelector => handleEvents(prebootData, appData, eventSelector));
    });
  }

  /**
   * Create an overlay div and add it to the DOM so it can be used
   * if a freeze event occurs
   *
   * @param document The global document object (passed in for testing purposes)
   * @returns Element The overlay node is returned
   */
  function createOverlay(document: Document): Element {
    let overlay = document.createElement('div');
    overlay.setAttribute('id', 'prebootOverlay');
    overlay.setAttribute('style', 'display:none;position:absolute;left:0;' +
      'top:0;width:100%;height:100%;z-index:999999;background:black;opacity:.3');
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Get references to all app root nodes based on input options. Users can initialize preboot
   * either by specifying appRoot which is just one or more selectors for apps, or if you want
   * to get more complex they can pass in the serverClientRoot option which contains selectors
   * for both the client and the server. This section option is useful for people that are
   * doing their own buffering (i.e. they have their own client and server view)
   *
   * @param document The global document object passed in for testing purposes
   * @param opts Options passed in by the user to init()
   * @returns ServerClientRoot[] An array of root info for each app
   */
  function getAppRoots(document: Document, opts: PrebootOptions): ServerClientRoot[] {
    let roots = <ServerClientRoot[]> (opts.serverClientRoot || []);

    // loop through any appRoot selectors to add them to the list of roots
    if (opts.appRoot && opts.appRoot.length) {
      let appRootSelectors = [].concat(opts.appRoot);
      appRootSelectors.forEach(selector => roots.push({ serverSelector: selector }));
    }

    // now loop through the roots to get the nodes for each root
    roots.forEach(function (root) {
      root.serverNode = document.querySelector(root.serverSelector);
      root.clientSelector = root.clientSelector || root.serverSelector;

      if (root.clientSelector !== root.serverSelector) {

        // if diff selectors, then just get the client node
        root.clientNode = document.querySelector(root.clientSelector);

      } else if (opts.buffer) {

        // if we are doing buffering, we need to create the buffer for the client
        root.clientNode = createBuffer(root);

      } else {

        // else the client root is the same as the server
        root.clientNode = root.serverNode;

      }

      // if no server node found, log error
      if (!root.serverNode) {
        console.log('No server node found for selector: ' + root.serverSelector);
      }
    });

    return roots;
  }

  /**
   * Under given server root, for given selector, record events
   *
   * @param prebootData
   * @param appData
   * @param eventSelector
   * @param createHandler
   */
  function handleEvents(prebootData: PrebootData, appData: PrebootAppData, eventSelector: EventSelector) {

    // get all nodes under the server root that match the given selector
    let nodes = <[Element]> appData.root.serverNode.querySelectorAll(eventSelector.selector);

    // we want to add an event listener for each node and each event
    for (let node of nodes) {
      eventSelector.events.forEach(function (eventName: string) {

        // get the appropriate handler and add it as an event listener
        let handler = createListenHandler(prebootData, eventSelector, appData);
        node.addEventListener(eventName, handler);

        // need to keep track of listeners so we can do node.removeEventListener() when preboot done
        prebootData.listeners.push({
          node: node,
          eventName: eventName,
          handler: handler
        });
      });
    }
  }

  /**
   * Create handler for events that we will record
   */
  function createListenHandler(prebootData: PrebootData, eventSelector: EventSelector, appData: PrebootAppData): Function {
    return function (event: DomEvent) {
      let root = appData.root;
      let node = event.target;
      let eventName = event.type;

      // if no node or no event name or not listening, just return
      if (!node || !eventName || !prebootData.listening) { return; }

      // if key codes set for eventSelector, then don't do anything if event doesn't include key
      let keyCodes = eventSelector.keyCodes;
      if (keyCodes && keyCodes.length) {
        let matchingKeyCodes = keyCodes.filter((keyCode) => event.which === keyCode);

        // if there are not matches (i.e. key entered NOT one of the key codes) then don't do anything
        if (!matchingKeyCodes.length) {
          return;
        }
      }

      // if for a given set of events we are preventing default, do that
      if (eventSelector.preventDefault) {
        event.preventDefault();
      }

      // if an action handler passed in, use that
      if (eventSelector.action) {
        eventSelector.action(node, event);
      }

      // get the node key for a given node
      let nodeKey = getNodeKey({ root: root, node: node });

      // if event on input or text area, record active node
      if (CARET_EVENTS.indexOf(eventName) >= 0 && CARET_NODES.indexOf(node.tagName) >= 0) {
        prebootData.activeNode = {
          root: root,
          node: node,
          nodeKey: nodeKey,
          selection: getSelection(node)
        };
      } else if (eventName !== 'change' && eventName !== 'focusout') {;
        prebootData.activeNode = null;
      }

      // if we are freezing the UI
      if (eventSelector.freeze) {
        let overlay = prebootData.overlay;

        // show the overlay
        overlay.style.display = 'block';

        // hide the overlay after 10 seconds just in case preboot.complete() never called
        setTimeout(function () {
          overlay.style.display = 'none';
        }, 10000);
      }

      // we will record events for later replay unless explicitly marked as doNotReplay
      if (!eventSelector.noReplay) {
        appData.events.push({
          node: node,
          nodeKey: nodeKey,
          event: event,
          name: eventName
        });
      }
    };
  }

  /**
   * Attempt to generate key from node position in the DOM
   *
   * NOTE: this function is duplicated in preboot_browser.ts and must be
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

  /**
   * Get the selection data that is later used to set the cursor after client view is active
   */
  function getSelection(node: Element): Selection {
    node = node || {};

    let nodeValue = node.value || '';
    let selection = <Selection> {
      start: nodeValue.length,
      end: nodeValue.length,
      direction: 'forward'
    };

    // if browser support selectionStart on node (Chrome, FireFox, IE9+)
    try {
      if (node.selectionStart || node.selectionStart === 0) {
        selection.start = node.selectionStart;
        selection.end = node.selectionEnd;
        selection.direction = node.selectionDirection;
      }
    } catch (ex) {}

    return selection;
  }

  /**
   * Create buffer for a given node
   *
   * @param root All the data related to a particular app
   * @returns {Element} Returns the root client node.
   */
  function createBuffer(root: ServerClientRoot): Element {
    let serverNode = root.serverNode;

    // if no rootServerNode OR the selector is on the entire html doc or the body OR no parentNode, don't buffer
    if (!serverNode || !serverNode.parentNode ||
      root.serverSelector === 'html' || root.serverSelector === 'body') {

      return serverNode;
    }

    // create shallow clone of server root
    let rootClientNode = serverNode.cloneNode(false);
    if (rootClientNode) {

      // we want the client to write to a hidden div until the time for switching the buffers
      rootClientNode.style.display = 'none';

      // insert the client node before the server and return it
      serverNode.parentNode.insertBefore(rootClientNode, serverNode);
    }

    // return the rootClientNode
    return rootClientNode;
  }

  // return object with all the functions for testing purposes
  return {
    init: init,
    start: start,
    createOverlay: createOverlay,
    getAppRoots: getAppRoots,
    handleEvents: handleEvents,
    createListenHandler: createListenHandler,
    getNodeKey: getNodeKey,
    getSelection: getSelection,
    createBuffer: createBuffer
  };
}

/**
 * This is a wrapper for the DOM that is used by preboot. We do this
 * for a few reasons. It makes the other preboot code more simple,
 * makes things easier to test (i.e. just mock out the DOM) and it
 * centralizes our DOM related interactions so we can more easily
 * add fixes for different browser quirks
 */
import {Element} from '../interfaces/element';
import {CursorSelection} from '../interfaces/preboot_ref';

export let nodeCache = {};
export let state = {
  window: null,
  document: null,
  body: null,
  appRoot: null,
  serverRoot: null,
  clientRoot: null
};

/**
 * Initialize the DOM state based on input
 */
export function init(opts: any) {
  state.window = opts.window || state.window || {};
  state.document = opts.document || (state.window && state.window.document) || {};
  state.body = opts.body || (state.document && state.document.body);
  state.appRoot = opts.appRoot || state.body;
  state.serverRoot = state.clientRoot = state.appRoot;
}

/**
 * Setter for app root
 */
export function updateRoots(appRoot: Element, serverRoot?: Element, clientRoot?: Element) {
  state.appRoot = appRoot;
  state.serverRoot = serverRoot;
  state.clientRoot = clientRoot;
}

/**
 * Get a node in the document
 */
export function getDocumentNode(selector: string): Element {
  return state.document.querySelector(selector);
}

/**
 * Get one app node
 */
export function getAppNode(selector: string): Element {
  return state.appRoot.querySelector(selector);
}

/**
 * Get all app nodes for a given selector
 */
export function getAllAppNodes(selector: string): Element[] {
  return state.appRoot.querySelectorAll(selector);
}

/**
 * Get all nodes under the client root
 */
export function getClientNodes(selector: string): Element[] {
  return state.clientRoot.querySelectorAll(selector);
}

/**
 * Add event listener at window level
 */
export function onLoad(handler: Function) {
  if (state.document && state.document.readyState === 'interactive') {
    handler();
  } else {
    state.document.addEventListener('DOMContentLoaded', handler);
  }
}

/**
 * These are global events that get passed around. Currently
 * we use the document to do this.
 */
export function on(eventName: string, handler: Function) {
  state.document.addEventListener(eventName, handler);
}

/**
 * Dispatch an event on the document
 */
export function dispatchGlobalEvent(eventName: string) {
  state.document.dispatchEvent(new state.window.Event(eventName));
}

/**
 * Dispatch an event on a specific node
 */
export function dispatchNodeEvent(node: Element, eventName: string) {
  node.dispatchEvent(new state.window.Event(eventName));
}

/**
 * Check to see if the app contains a particular node
 */
export function appContains(node: Element) {
  return state.appRoot.contains(node);
}

/**
 * Create a new element
 */
export function addNodeToBody(type: string, className: string, styles: Object): Element {
  let elem = state.document.createElement(type);
  elem.className = className;

  if (styles) {
    for (var key in styles) {
      if (styles.hasOwnProperty(key)) {
        elem.style[key] = styles[key];
      }
    }
  }

  return state.body.appendChild(elem);
}

/**
 * Remove a node since we are done with it
 */
export function removeNode(node: Element) {
  if (!node) { return; }

  node.remove ?
    node.remove() :
    node.style.display = 'none';
}

/**
 * Get the caret position within a given node. Some hackery in
 * here to make sure this works in all browsers
 */
export function getSelection(node: Element): CursorSelection {
  let selection = {
    start: 0,
    end: 0,
    direction: 'forward'
  };

  // if browser support selectionStart on node (Chrome, FireFox, IE9+)
  if (node  && (node.selectionStart || node.selectionStart === 0)) {
    selection.start = node.selectionStart;
    selection.end = node.selectionEnd;
    selection.direction = node.selectionDirection;

  // else if nothing else for older unsupported browsers, just put caret at the end of the text
  } else if (node && node.value) {
    selection.start = selection.end = node.value.length;
  }

  return selection;
}

/**
 * Set caret position in a given node
 */
export function setSelection(node: Element, selection: CursorSelection) {

  // as long as node exists, set focus
  if (node) {
    node.focus();
  }

  // set selection if a modern browser (i.e. IE9+, etc.)
  if (node && node.setSelectionRange && selection) {
    node.setSelectionRange(selection.start, selection.end, selection.direction);
  }
}

/**
 * Get a unique key for a node in the DOM
 */
export function getNodeKey(node: Element, rootNode: Element): string {
  let ancestors = [];
  let temp = node;
  while (temp && temp !== rootNode) {
    ancestors.push(temp);
    temp = temp.parentNode;
  }

  // push the rootNode on the ancestors
  if (temp) {
    ancestors.push(temp);
  }

  // now go backwards starting from the root
  let key = node.nodeName;
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
 * Given a node from the server rendered view, find the equivalent
 * node in the client rendered view.
 */
export function findClientNode(serverNode: Element, nodeKey?: any): Element {

  // if nothing passed in, then no client node
  if (!serverNode) { return null; }

  // we use the string of the node to compare to the client node & as key in cache
  let serverNodeKey = nodeKey || getNodeKey(serverNode, state.serverRoot);

  // first check to see if we already mapped this node
  let nodes = nodeCache[serverNodeKey] || [];

  for (let nodeMap of nodes) {
    if (nodeMap.serverNode === serverNode) {
      return nodeMap.clientNode;
    }
  }

  // todo: improve this algorithm in the future so uses fuzzy logic (i.e. not necessarily perfect match)
  let selector = serverNode.tagName;
  let className = (serverNode.className || '').replace('ng-binding', '').trim();

  if (serverNode.id) {
    selector += '#' + serverNode.id;
  } else if (className) {
    selector += '.' + className.replace(/ /g, '.');
  }

  let clientNodes = getClientNodes(selector);
  for (let clientNode of clientNodes) {

    // todo: this assumes a perfect match which isn't necessarily true
    if (getNodeKey(clientNode, state.clientRoot) === serverNodeKey) {

      // add the client/server node pair to the cache
      nodeCache[serverNodeKey] = nodeCache[serverNodeKey] || [];
      nodeCache[serverNodeKey].push({
        clientNode: clientNode,
        serverNode: serverNode
      });

      return clientNode;
    }
  }

  // if we get here it means we couldn't find the client node
  return null;
}

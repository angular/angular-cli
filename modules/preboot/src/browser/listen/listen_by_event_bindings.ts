import {PrebootRef} from '../../interfaces/preboot_ref';
import {ListenStrategy} from '../../interfaces/strategy';
import {NodeEvent} from '../../interfaces/event';

// regex for how events defined in Angular 2 templates; for example:
//    <div on-click="blah()">
//    <div (click)="blah()">
const ngEventPattern = /^(?:on-|\()([-\w]+)\)?$/;

// state for this module just includes the nodeEvents (exported for testing purposes)
export let state = { nodeEvents: [] };

/**
 * This is from Crockford to walk the DOM (http://whlp.ly/1Ii6YbR).
 * Recursively walk DOM tree and execute input param function at
 * each node.
 */
export function walkDOM(node: any, func: Function) {
  if (!node) { return; }

  func(node);
  node = node.firstChild;
  while (node) {
    walkDOM(node, func);
    node = node.nextSibling;
  }
}

/**
 * This is function called at each node while walking DOM.
 * Will add node event if events defined on element.
 */
export function addNodeEvents(node: any) {
  let attrs = node.attributes;

  // if no attributes, return without doing anything
  if (!attrs) { return; }

  // otherwise loop through attributes to try and find an Angular 2 event binding
  for (let attr of attrs) {
    let name = attr.name;

    // extract event name from the () or on- (TODO: replace this w regex)
    let matchedEventName = name.match(ngEventPattern);

    // if attribute name is an Angular 2 event binding
    if (matchedEventName && matchedEventName.length > 0) {
      state.nodeEvents.push({
        node: node,
        eventName: matchedEventName.pop()
      });
    }
  }
}

/**
 * This listen strategy will look for a specific attribute which contains all the elements
 * that a given element is listening to.
 */
export function getNodeEvents(preboot: PrebootRef, strategy: ListenStrategy): NodeEvent[] {
  state.nodeEvents = [];
  walkDOM(preboot.dom.state.body, addNodeEvents);
  return state.nodeEvents;
}

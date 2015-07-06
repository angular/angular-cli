import {PrebootRef} from '../../interfaces/preboot_ref';
import {ListenStrategy} from '../../interfaces/strategy';
import {NodeEvent} from '../../interfaces/event';

/**
 * This listen strategy will look for a specific attribute which contains all the elements
 * that a given element is listening to. For ex. <div preboot-events="click,focus,touch">
 */
export function getNodeEvents(preboot: PrebootRef, strategy: ListenStrategy): NodeEvent[] {
  let attributeName = strategy.attributeName || 'preboot-events';
  let elems = preboot.dom.getAllAppNodes('[' + attributeName + ']');

  // if no elements found, return empty array since no node events
  if (!elems) { return []; }

  // else loop through all the elems and add node events
  let nodeEvents = [];
  for (let elem of elems) {
    let events = elem.getAttribute(attributeName).split(',');

    for (let eventName of events) {
      nodeEvents.push({
        node: elem,
        eventName: eventName
      });
    }
  }

  return nodeEvents;
}

import {PrebootRef} from '../../interfaces/preboot_ref';
import {ReplayStrategy} from '../../interfaces/strategy';
import {PrebootEvent} from '../../interfaces/event';

/**
 * this replay strategy assumes that the browser did not blow away
 * the server generated HTML and that the elements in memory for
 * preboot can be used to replay the events.
 * 
 * any events that could not be replayed for whatever reason are returned.
 */
export function replayEvents(preboot: PrebootRef, strategy: ReplayStrategy, events: PrebootEvent[]): PrebootEvent[] {
  let remainingEvents = [];
  events = events || [];

  for (let eventData of events) {
    let event = eventData.event;
    let node = eventData.node;

    // if we should check to see if the node exists in the DOM before dispatching
    // note: this can be expensive so this option is false by default
    if (strategy.checkIfExists && !preboot.dom.appContains(node)) {
      remainingEvents.push(eventData);
    } else {
      node.dispatchEvent(event);
    }
  }

  return remainingEvents;
}

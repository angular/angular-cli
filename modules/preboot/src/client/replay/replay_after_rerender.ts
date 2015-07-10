import {PrebootRef} from '../../interfaces/preboot_ref';
import {ReplayStrategy} from '../../interfaces/strategy';
import {PrebootEvent} from '../../interfaces/event';

/**
 * This replay strategy assumes that the client completely re-rendered
 * the page so reboot will need to find the element in the new client
 * rendered DOM that matches the element it has in memory.
 * 
 * Any events that could not be replayed for whatever reason are returned.
 */
export function replayEvents(preboot: PrebootRef, strategy: ReplayStrategy, events: PrebootEvent[]): PrebootEvent[] {
  let remainingEvents = [];
  events = events || [];

  // loop through the events, find the appropriate client node and dispatch the event
  for (let eventData of events) {
    let event = eventData.event;
    let serverNode = eventData.node;
    let clientNode = preboot.dom.findClientNode(serverNode);

    // if client node found, need to explicitly set value and then dispatch event
    if (clientNode) {
      clientNode.value = serverNode.value;
      clientNode.dispatchEvent(event);
      preboot.log(3, serverNode, clientNode, event);
    } else {
      remainingEvents.push(eventData);
      preboot.log(4, serverNode);
    }
  }

  return remainingEvents;
}

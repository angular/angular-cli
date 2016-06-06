import {App, AppState} from '../../interfaces/app';
import {ReplayStrategy} from '../../interfaces/strategy';
import {PrebootEvent} from '../../interfaces/event';

/**
 * This replay strategy assumes that the browser completely re-rendered
 * the page so reboot will need to find the element in the new browser
 * rendered DOM that matches the element it has in memory.
 *
 * Any events that could not be replayed for whatever reason are returned.
 */
export function replayEvents(app: App, appState: AppState, strategy: ReplayStrategy, events: PrebootEvent[]): PrebootEvent[] {
  let remainingEvents = [];
  events = events || [];

  // loop through the events, find the appropriate browser node and dispatch the event
  for (let eventData of events) {
    let event = eventData.event;
    let serverNode = eventData.node;
    let nodeKey = eventData.nodeKey;
    let clientNode = app.findClientNode(appState, serverNode, nodeKey);

    // if client node found, need to explicitly set value and then dispatch event
    if (clientNode) {
      clientNode.checked = serverNode.checked ? true : undefined;
      clientNode.selected = serverNode.selected ? true : undefined;
      clientNode.value = serverNode.value;
      clientNode.dispatchEvent(event);
      // preboot.log(3, serverNode, clientNode, event);
    } else {
      remainingEvents.push(eventData);
      // preboot.log(4, serverNode);
    }
  }

  return remainingEvents;
}

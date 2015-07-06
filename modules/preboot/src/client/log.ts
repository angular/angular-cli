import {PrebootOptions} from '../interfaces/preboot_options';
import {PrebootEvent} from '../interfaces/event';
import {Element} from '../interfaces/element';

function logOptions(opts: PrebootOptions) {
    console.log('preboot options are:');
    console.log(opts);
}

function logEvents(events: PrebootEvent[]) {
    console.log('preboot events captured are:');
    console.log(events);
}

function replaySuccess(serverNode: Element, clientNode: Element, event: any) {
    console.log('replaying:');
    console.log({
        serverNode: serverNode,
        clientNode: clientNode,
        event: event
    });
}

function missingClientNode(serverNode: Element) {
    console.log('preboot could not find client node for:');
    console.log(serverNode);
}

function remainingEvents(events: PrebootEvent[]) {
    if (events && events.length) {
        console.log('the following events were not replayed:');
        console.log(events);
    }
}

function noRefocus(serverNode: Element) {
  console.log('Could not find node on client to match server node for refocus:');
  console.log(serverNode);
}

let logMap = {
    '1': logOptions,
    '2': logEvents,
    '3': replaySuccess,
    '4': missingClientNode,
    '5': remainingEvents,
    '6': noRefocus
};

/**
 * Idea here is simple. If debugging turned on and this module exists, we
 * log various things that happen in preboot. The calling code only references
 * a number (keys in logMap) to a handling function. By doing this, we are
 * able to cut down on the amount of logging code in preboot when no in debug mode.
 */
export function log(...args) {
    if (!args.length) { return; }

    let id = args[0] + '';
    let fn = logMap[id];

    if (fn) {
      fn(...args.slice(1));
    } else {
      console.log('log: ' + JSON.stringify(args));
    }
}

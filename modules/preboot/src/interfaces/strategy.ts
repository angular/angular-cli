import {AppState} from './app';
import {Element} from './element';
import {DomEvent} from './event';

export interface ListenStrategy {
  name?: string;
  attributeName?: string;
  eventsBySelector?: Object;
  preventDefault?: boolean;
  trackFocus?: boolean;
  doNotReplay?: boolean;
  dispatchEvent?: string;
  action?(appstate: AppState, node: Element, event: DomEvent);
}

export interface ReplayStrategy {
  name?: string;
  checkIfExists?: boolean;
}

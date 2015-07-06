import {PrebootRef} from './preboot_ref';
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
  action?(preboot: PrebootRef, node: Element, event: DomEvent);
}

export interface ReplayStrategy {
  name?: string;
  checkIfExists?: boolean;
}

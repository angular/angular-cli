import {DomEvent} from './event';

export interface Style {
  display: string;
}

export interface Element {
  id?: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
  tagName?: string;
  nodeName?: string;
  className?: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: string;
  selection?: any;
  createTextRange?(): any;
  setSelectionRange?(fromPos: number, toPos: number, direction: string);
  style?: Style;
  parentNode?: Element;
  childNodes?: Element[];
  attributes?: string[];
  remove?();
  focus?();
  dispatchEvent?(event: DomEvent);
  getAttribute?(name: string): string;
  cloneNode?(deep: boolean): Element;
  insertBefore?(nodeToInsert: Element, beforeNode: Element);
}

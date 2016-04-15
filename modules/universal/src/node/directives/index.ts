import {NodeForm} from './node_form';
import {NodeUniversalStyles} from './node_universal_styles';
import {provide, PLATFORM_DIRECTIVES} from 'angular2/core';

export * from './node_form';

export const NODE_FORM_DIRECTIVES: Array<any> = [
  NodeForm
];

export const NODE_DIRECTIVES: Array<any> = [
  NodeUniversalStyles
];

export const NODE_PLATFORM_DIRECTIVES: Array<any> = [
  provide(PLATFORM_DIRECTIVES, { multi: true, useValue: NODE_DIRECTIVES })
];

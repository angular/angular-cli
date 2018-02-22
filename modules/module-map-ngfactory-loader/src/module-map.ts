/**
 * A map keyed by loadChildren strings and Modules or NgModuleFactories as vaules
 */
import {NgModuleFactory, Type} from '@angular/core';

export type ModuleMap = {
  [key: string]: Type<any> | NgModuleFactory<any>;
};

import { IRequestParams } from "./request-params";
import { Type, NgModuleFactory, StaticProvider } from '@angular/core';

export interface IEngineOptions {
  appSelector: string;                      // e.g., <app-root></app-root>
  request: IRequestParams;                  // e.g., params
  ngModule: Type<{}> | NgModuleFactory<{}>; // e.g., AppModule
  providers?: StaticProvider[];             // StaticProvider[]
}

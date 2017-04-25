import { IRequestParams } from "./request-params";
import { Type, NgModuleFactory, Provider } from '@angular/core';

export interface IEngineOptions {
  appSelector: string;
  request: IRequestParams;
  ngModule: Type<{}> | NgModuleFactory<{}>;
  providers?: Provider[];
};

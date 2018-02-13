import { NgModuleRef } from "@angular/core";

export interface IEngineRenderResult {
  html: string;
  moduleRef: NgModuleRef<{}>;
  globals: {
    styles: string;
    title: string;
    meta: string;
    transferData?: {};
    [key: string]: any;
  };
}

import { NgModule } from '@angular/core';
import { NodeModule, platformDynamicNode } from '@angular/universal';

import { App } from './app';


export const platform = platformDynamicNode([

]);

export function main(doc) {

  @NgModule({
    bootstrap: [ App ],
    declarations: [ App ],
    imports: [
      NodeModule.forDocument(doc)
    ],
    providers: [

    ]
  })
  class MainModule {}

  return platform
    .serializeModule(MainModule)
    .then((html) => {
      console.log('done')
      return html
    });
};



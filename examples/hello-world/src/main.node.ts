import { NgModule, Component, Injectable } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  platformDynamicNode
} from '@angular/universal';

import { App } from './app';


@Component({
  selector: 'another-component',
  template: 'SERVER-RENDERED'
})
class AnotherComponent {}

export const platform = platformDynamicNode();

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}
export function main(document, config?: any) {
  var id = s4();
  console.time('ngApp '+ id)

  @NgModule({
    bootstrap: [ App, AnotherComponent ],
    declarations: [ App, AnotherComponent ],
    imports: [
      NodeModule.withConfig({
        document: document,
        originUrl: 'http://localhost:3000',
        baseUrl: '/',
        requestUrl: '/',
        preboot: {
          appRoot: ['app'],
          uglify: true
        },
      }),
      NodeHttpModule,
      NodeJsonpModule
    ]
  })
  class MainModule {
    ngOnInit() {
      console.log('ngOnInit');
    }
    // ngDoCheck() {
    //   console.log('ngDoCheck');
    //   return true;
    // }
    ngOnStable() {
      console.log('ngOnStable');
    }
    ngOnRendered() {
      console.log('ngOnRendered');
    }
  }

  // nodePlatform serialize
  return platform
    .serializeModule(MainModule, config)
    .then((html) => {
      console.timeEnd('ngApp ' + id)
      console.log('\n -- serializeModule FINISHED --');
      return html;
    });
};



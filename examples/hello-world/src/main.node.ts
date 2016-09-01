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

var count = 0;
export function main(document, config?: any) {
  count++
  console.time('ngApp '+ count)

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
      console.timeEnd('ngApp ' + count)
      console.log('\n -- serializeModule FINISHED --');
      return html;
    });
};



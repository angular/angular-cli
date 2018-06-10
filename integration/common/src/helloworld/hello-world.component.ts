/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'hello-world-app',
  template: `
    <div id="name">Hello {{ name }}!</div>
    <div id="counter">Counter: {{ counter }}</div>
  `,
  styles: [`
    div {
      font-weight: bold;
    }
  `]
})
export class HelloWorldComponent implements OnInit {
  name: string = 'world';
  counter = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('http://localhost:9876/counter').subscribe(d => {
      this.counter = d['counter'];
    });
  }
}

/// <reference path="../../../../custom_typings/_custom.d.ts" />
console.time('angular2/core in client');
import * as angular from 'angular2/core';
console.timeEnd('angular2/core in client');

import {
  Component,
  View,
  ViewEncapsulation,
  bind
} from 'angular2/core';

import {bootstrap} from 'angular2/platform/browser';

// import {
//   Http,
//   HTTP_PROVIDERS
// } from 'angular2/http';

// import {
//   NG_PRELOAD_CACHE_PROVIDERS,
//   PRIME_CACHE
// } from '../../../../modules/universal/client/client';



function transformData(data) {
  if (data.hasOwnProperty('created_at')) {
    data.created_at = new Date(data.created_at);
  }
  return data;
}

@Component({
  selector: 'app',
  providers: [],
  directives: [],
  styles: [`
    #intro {
      background-color: red;
    }
  `],
  template: `
  <h1 id="intro">Hello Server Renderer</h1>
  <h3>test binding {{ value }}</h3>
  <span>{{ value }}</span>
  {{ value }}


  <form name="testingForm">
    <input name="testingInput" type="text">
    <button>Submit</button>
  </form>

  <div>
    <pre>// App.testing()
{{ testing() | json }}</pre>
    <pre>// App.clickingTest()
{{ buttonTest | json }}</pre>
  </div>
  <div>
    <input
      id="defaultValueInput"
      type="text"
      autofocus
      [value]="value"
      (keyup)="value = $event.target.value">
    {{ value }}
  </div>
  <div>
    <button (click)="clickingTest()">Click Test</button>
  </div>

  <div>
    <button (click)="toggleNgIf()">Toggle NgIf</button>
  </div>
  <div *ngIf="toggle">
    NgIf true
  </div>

  <ul>
    <li *ngFor="var item of items">
      <input
        type="checkbox"
        [checked]="item.completed"
        (change)="item.completed = $event.target.checked">
      <pre>{{ item | json }}</pre>
    </li>
  </ul>

  <div>
    <button (click)="addItem()">Add Item</button>
    <button (click)="removeItem()">Remove Item</button>
  </div>



  <p>
    Problem with default component state and stateful DOM
    <br>
    <input #testInput [value]="testingInput" (change)="log($event)">
    {{ testingInput }}
  </p>


  `
})
export class App {
  static queries = {
    todos: '/api/todos'
  };

  value: string        = 'value8';
  items: Array<any>    = [];
  toggle: boolean      = true;
  itemCount: number    = 0;
  buttonTest: string   = '';
  testingInput: string = 'default state on component';

  // todosObs1$ = this.http.get(App.queries.todos)
  //   .filter(res => res.status >= 200 && res.status < 300)
  //   .map(res => res.json())
  //   .map(data => transformData(data)); // ensure correct data prop types
  // todosObs2$ = this.http.get(App.queries.todos)
  //   .filter(res => res.status >= 200 && res.status < 300)
  //   .map(res => res.json())
  //   .map(data => transformData(data)); // ensure correct data prop types
  // todosObs3$ = this.http.get(App.queries.todos)
  //   .map(res => res.json())
  //   .map(data => transformData(data));

  constructor(/*private http: Http*/) {

  }

  onInit() {
    // this.addItem();
    // this.addItem();
    // this.addItem();

    // this.todosObs1$.subscribe(
    //   // onValue
    //   todos => {
    //     todos.map(todo => this.addItem(todo));
    //     this.anotherAjaxCall();
    //   },
    //   // onError
    //   err => {
    //     console.error('err', err);
    //     throw err;
    //   },
    //   // onComplete
    //   () => {
    //     console.log('complete request1');
    //   });

    // this.todosObs2$.subscribe(
    //   // onValue
    //   todos => {
    //     console.log('another call 2', todos);
    //     todos.map(todo => this.addItem(todo));
    //     // this.anotherAjaxCall();
    //   },
    //   // onError
    //   err => {
    //     console.error('err', err);
    //     throw err;
    //   },
    //   // onComplete
    //   () => {
    //     console.log('complete request2');
    //   });

  }
  anotherAjaxCall() {
    // this.todosObs3$.subscribe(
    //   todos => {
    //     console.log('anotherAjaxCall data 3', todos);
    //   },
    //   err => {
    //     console.log('anotherAjaxCall err')
    //   },
    //   () => {
    //     console.log('anotherAjaxCall complete ajax')
    //   });
  }

  log(value) {
    console.log('log:', value);
    return value;
  }

  toggleNgIf() {
    this.toggle = !this.toggle;
  }

  testing() {
    return 'testing' + 5;
  }

  clickingTest() {
    this.buttonTest = `click ${ this.testing() } ${ ~~(Math.random() * 20) }`;
    console.log(this.buttonTest);
  }

  addItem(value?: any) {
    if (value) {
      return this.items.push(value);
    }
    let defaultItem = {
      value: `item ${ this.itemCount++ }`,
      completed: true,
      created_at: new Date()
    };
    return this.items.push(defaultItem);
  }


  removeItem() {
    this.items.pop();
  }

}


export function main() {
  return bootstrap(App, [
    // HTTP_PROVIDERS,
    // NG_PRELOAD_CACHE_PROVIDERS,
    // bind(PRIME_CACHE).toValue(true)
  ]);
}

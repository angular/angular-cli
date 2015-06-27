/// <reference path="../../../../server/typings/tsd.d.ts" />
import {Component, View, onInit} from 'angular2/angular2';
import {Http} from 'angular2/http';
import {coreDirectives} from 'angular2/angular2';

@Component({
  selector: 'app',
  lifecycle: [ onInit ]
})
@View({
  directives: [ coreDirectives ],
  template: `
  <h1>Hello Server Renderer</h1>
  <h3>test binding {{ value }}</h3>
  <span>{{ value }}</span>
  {{ value }}

  <div>
    <pre>// App.testing()
{{ testing() | json }}</pre>
    <pre>// App.clickingTest()
{{ buttonTest | json }}</pre>
  </div>
  <div>
    <input type="text" autofocus [value]="value" (keyup)="value = $event.target.value; log(value)">
    {{ value }}
  </div>
  <div>
    <button (click)="clickingTest()">Click Test</button>
  </div>

  <div>
    <button (click)="toggleNgIf()">Toggle NgIf</button>
  </div>
  <div *ng-if="toggle">
    NgIf true
  </div>

  <ul>
    <li *ng-for="var item of items">
      <input type="checkbox" [value]="item.completed">
      {{ item.title }}
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
  value: string        = 'value8';
  items: Array<string> = [];
  toggle: boolean      = true;
  itemCount: number    = 0;
  buttonTest: string   = '';
  testingInput: string = 'default state on component';
  constructor(private http: Http) {
  }

  onInit() {
    this.addItem();
    this.addItem();
    this.addItem();

    var todosObs = this.http.get('/api/todos').
      // filter(res => res.status >= 200 && res.status < 300).
      map(res => res.json());
    todosObs.subscribe(
      value => {
        this.addItem(value);
        console.log('next', value)
      },
      err => {
        console.error('err', err);
        throw err;
      },
      complete => {
        console.log('complete', complete)
      }
    );
  }

  log(val) {
    console.log(val);
  }

  toggleNgIf() {
    this.toggle = !this.toggle;
  }

  testing() {
    return 'testing' + 5;
  }

  clickingTest() {
    this.buttonTest = `click ${ this.testing() } ${ ~~(Math.random()*20) }`;
    console.log(this.buttonTest);
  }

  addItem(value?: any) {
    this.items.push(value || {
      title: `item ${ this.itemCount++ }`,
      completed: false
    });
  }

  removeItem() {
    this.items.pop();
  }

}

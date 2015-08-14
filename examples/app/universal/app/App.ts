/// <reference path="../../../../custom_typings/_custom.d.ts" />
import {Component, View, LifecycleEvent, ViewEncapsulation} from 'angular2/angular2';
// import {Http} from 'http/http';
import {CORE_DIRECTIVES} from 'angular2/directives';

function transformData(data) {
  data.created_at = new Date(data.created_at);
  return data;
}

@Component({
  selector: 'app',
  lifecycle: [ (<any>LifecycleEvent).onInit ],
  bindings: [ ]
})
@View({
  encapsulation: ViewEncapsulation.EMULATED,
  directives: [ CORE_DIRECTIVES ],
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
  <div *ng-if="toggle">
    NgIf true
  </div>

  <ul>
    <li *ng-for="var item of items">
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
  value: string        = 'value8';
  items: Array<string> = [];
  toggle: boolean      = true;
  itemCount: number    = 0;
  buttonTest: string   = '';
  testingInput: string = 'default state on component';

  constructor(/*private http: Http*/) {

  }

  onInit() {
    this.addItem();
    this.addItem();
    this.addItem();

    // var todosObs = this.http.get('/api/todos').
    //     toRx().
    //     filter(res => res.status >= 200 && res.status < 300).
    //     map(res => res.json()).
    //     map(data => data.map(transformData));

    //   todosObs.subscribe(
    //     todos => {
    //       todos.map(this.addItem.bind(this));
    //     },
    //     err => {
    //       console.error('err', err);
    //       throw err;
    //     },
    //     complete => {
    //       // console.log('complete', complete);
    //     }
    //   );

  }

  log(val) {
    console.log('App.ts loggin...', val);
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
    var defaultItem = {
      value: `item ${ this.itemCount++ }`,
      completed: true,
      created_at: new Date()
    };
    this.items.push(value || defaultItem);
  }

  removeItem() {
    this.items.pop();
  }

}

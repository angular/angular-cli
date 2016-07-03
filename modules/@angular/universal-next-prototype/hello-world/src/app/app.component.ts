import { Component } from '@angular/core';

@Component({
  selector: 'wat',
  template: `
    <div>
      Hello World
    </div>
  `
})
export class Wat {
  constructor () {

  }
}

@Component({
  selector: 'app',
  directives: [Wat],
  template: `
    <div>
      Hello World
      {{ wat }}
      <wat>
      </wat>
    </div>
  `
})
export class App {
  wat;
  constructor () {

  }
  ngOnInit() {
    setTimeout(() => {
      this.wat = 'yolo' + Math.random();
    }, 10)
  }

}

import { Component, ViewEncapsulation } from '@angular/core';
import { MyInjectable } from './injectable';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  value: number;
  constructor(public inj: MyInjectable) {
    this.value = inj.value;
  }
}

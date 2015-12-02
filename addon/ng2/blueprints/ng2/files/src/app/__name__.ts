import {Component} from 'angular2/core';


@Component({
  selector: '<%= htmlComponentName %>-app',
  providers: [],
  templateUrl: 'app/<%= htmlComponentName %>.html',
  directives: [],
  pipes: []
})
export class <%= jsComponentName %>App {
  defaultMeaning: number = 42;
  
  meaningOfLife(meaning) {
    return `The meaning of life is ${meaning || this.defaultMeaning}`;
  }
}

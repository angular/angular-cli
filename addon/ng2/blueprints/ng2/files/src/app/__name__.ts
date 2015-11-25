import {Component} from 'angular2/angular2';


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

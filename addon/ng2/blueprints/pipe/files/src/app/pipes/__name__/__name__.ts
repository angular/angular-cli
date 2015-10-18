import {Pipe} from 'angular2/angular2';


@Pipe({
  name: '<%= classifiedModuleName %>'
})
export class <%= classifiedModuleName %> {

  transform(value, args?) {
    return value;
  }

}
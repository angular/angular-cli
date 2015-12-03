import {Pipe} from 'angular2/core';


@Pipe({
  name: '<%= classifiedModuleName %>'
})
export class <%= classifiedModuleName %> {

  transform(value, args?) {
    return null;
  }

}

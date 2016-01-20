import {Pipe, PipeTransform} from 'angular2/core';


@Pipe({
  name: '<%= classifiedModuleName %>'
})
export class <%= classifiedModuleName %> implements PipeTransform {

  transform(value, args?) {
    return null;
  }

}

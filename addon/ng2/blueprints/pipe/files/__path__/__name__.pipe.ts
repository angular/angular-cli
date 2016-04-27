import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: '<%= camelizedModuleName %>'
})
export class <%= classifiedModuleName %> implements PipeTransform {

  transform(value: any, args?: any): any {
    return null;
  }

}

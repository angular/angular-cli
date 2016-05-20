import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: '<%= camelizedModuleName %>'
})
export class <%= classifiedModuleName %>Pipe implements PipeTransform {

  transform(value: any, args?: any): any {
    return null;
  }

}

import * as stringUtils from '../strings';
import {Rule, mergeWith, apply, move, template, url} from '@angular/schematics';


export default function(options: any): Rule {
  return mergeWith([
    apply(url('./files'), [
      template({ utils: stringUtils, ...options }),
      move(options.sourceDir)
    ])
  ]);
};

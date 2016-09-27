//stub for ng2 compiler's ResourceLoader, responsible for fetching HTML and CSS files into the AoT compiler
//TODO: integrate this with webpack loaders for less/sass

import { ResourceLoader } from '@angular/compiler'
import * as fs from 'fs'

export class WebpackResourceLoader implements ResourceLoader {
  constructor(private compiler){}
  //called by AOT compiler to retrieve files from disk
  get(filePath){
    return Promise.resolve(fs.readFileSync(filePath, 'utf-8'))
      .then(resource => this.transform(resource));
  }
  transform(resource:string):string {
    return resource;
  }
}

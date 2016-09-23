import { ResourceLoader } from '@angular/compiler'
import * as fs from 'fs'

const noop = () => {}


const webpackContext = {
  cacheable: noop,
  exec: noop,
  async: noop
};

export class WebpackResourceLoader implements ResourceLoader {
  constructor(private compiler){}
  get(filePath){
    return Promise.resolve(fs.readFileSync(filePath, 'utf-8'));
  }
  transform(resource:string):string {
    return resource;
  }
}

import * as ngCompiler from '@angular/compiler-cli'
export function wrapCallback(fn, cb){
  fn.then(
    r => cb(),
    err => cb(err)
  )
}


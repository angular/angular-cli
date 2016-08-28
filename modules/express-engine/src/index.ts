
/*

--OLD_UNIVERSAL-- 

import * as engine from './engine';

export * from './engine';
export default engine;
*/


// Pat: Todo?

// const fs = require('graceful-fs');

// import {Bootloader, BootloaderConfig} from '@angular/universal';

// export interface ExpressEngineExtraOptions {
//   server?: boolean;
//   client?: boolean;
//   selector?: string;
//   serializedCmp?: string;
//   bootloader?: any;
//   reuseProviders?: boolean;
// }

// export type ExpressEngineConfig = BootloaderConfig & ExpressEngineExtraOptions;
export type ExpressEngineConfig = any;

export function expressEngine(filePath: string, options?: ExpressEngineConfig, done?: (err?: any, value?: any) => any) {

};

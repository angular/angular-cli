import * as universal from './node/node';
export * from './node/node';

function __global(m) {
  for (var p in m) { if (!global.hasOwnProperty(p)) { global[p] = m[p]; } }
}
__global(universal);

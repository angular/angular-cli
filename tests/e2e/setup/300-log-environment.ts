import {node, ng, npm} from '../utils/process';

const packages = require('../../../lib/packages').packages;


export default function() {
  return Promise.resolve()
    .then(() => console.log('Environment:'))
    .then(() => {
      Object.keys(process.env).forEach(envName => {
        console.log(`  ${envName}: ${process.env[envName].replace(/[\n\r]+/g, '\n        ')}`);
      });
    })
    .then(() => {
      console.log('Packages:');
      console.log(JSON.stringify(packages, null, 2));
    })
    .then(() => node('--version'))
    .then(() => npm('--version'))
    .then(() => ng('version'));
}

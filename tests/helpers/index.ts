import * as path from 'path';
import {writeFile, readFile} from 'fs-extra';
import { ng } from './ng';
import { setup, teardown } from './tmp';

export { ng };

export function setupProject() {
  beforeEach((done) => {
    spyOn(console, 'error');

    setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => ng(['new', 'foo', '--skip-install']))
      .then(() => addAppToProject())
      .then(done, done.fail);
  }, 10000);

  afterEach((done) => {
    teardown('./tmp').then(done, done.fail);
  });
}

function addAppToProject(): Promise<any> {
  const cliJson = path.join(path.join(process.cwd()), '.angular-cli.json');
  return readFile(cliJson, 'utf-8').then(content => {
    const json = JSON.parse(content);
    json.apps.push(({name: 'other', root: 'other/src', appRoot: ''}));
    return json;
  }).then(json => {
    return writeFile(cliJson, JSON.stringify(json, null, 2))
  });
}

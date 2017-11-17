import * as fs from 'fs-extra';
import * as path from 'path';
import { ng } from '../helpers';
const tmp = require('../helpers/tmp');

describe('Acceptance: ng generate applications', () => {
  beforeEach((done) => {
    spyOn(console, 'error');

    fs.symlinkSync(`${process.cwd()}/tests/collections/@custom`, `./node_modules/@custom`, 'dir');

    tmp.setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => ng(['new', 'empty', '--skip-install']))
      .then(() => removeAllApps())
      .then(done, done.fail);
  }, 10000);

  afterEach((done) => {
    tmp.teardown('./tmp').then(done, done.fail);
    fs.unlinkSync(path.join(__dirname, '/../../node_modules/@custom'));
  });

  it('ng generate app myapp', (done) => {
    return ng(['generate', 'app', 'myapp', '--collection', '@custom/app']).then(() => {
      expect(() => fs.readFileSync(`myapp/emptyapp`, 'utf8')).not.toThrow();
    })
    .then(done, done.fail);
  });
});

function removeAllApps(): Promise<any> {
  const cliJson = path.join(path.join(process.cwd()), '.angular-cli.json');
  return fs.readFile(cliJson, 'utf-8').then(content => {
    const json = JSON.parse(content);
    json.apps = [];
    json.defaults = {
      schematics: {
        newProject: ['app']
      }
    };
    return json;
  }).then(json => {
    return fs.writeFile(cliJson, JSON.stringify(json, null, 2));
  });
}

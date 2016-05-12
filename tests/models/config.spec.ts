import {CliConfig} from '../../addon/ng2/models/config';
import * as fs from 'fs';
import * as path from 'path';

const expect = require('chai').expect;
const config = path.resolve(process.cwd(), 'addon/ng2/blueprints/ng2/files/angular-cli.json');
const configCopy = path.resolve(process.cwd(), 'angular-cli.json');

function getContents() {
  return require(configCopy);
}

// TODO: revisit this test to make non-valid-JSON-friendly.
describe.skip('Config Tests', () => {
  before(() => {
    process.chdir(process.cwd());
  });

  beforeEach(() => {
    let contents = JSON.parse(fs.readFileSync(config, 'utf8'));
    fs.writeFileSync(configCopy, JSON.stringify(contents, null, 2), 'utf8');
  });

  afterEach(() => {
    try {
      fs.accessSync(configCopy);
      fs.unlinkSync(configCopy);
    } catch (e) { /* */ }
  });

  it('Throws an error if config file not exists', () => {
    fs.unlinkSync(configCopy);

    let fn = () => {
      return new CliConfig('foobar.json');
    }

    expect(fn).to.throw(Error);
  });

  it('Updates property of type `string` successfully', () => {
    let c = new CliConfig(configCopy);
    c.set('project.name', 'new-project-name');
    c.save();

    let contents = getContents();

    expect(contents).to.be.an('object');
    expect(contents.project.name).to.exist;
    expect(contents.project.name).to.be.equal('new-project-name');
  });

  it('Throws an error if try to assign property that does not exists', () => {
    let c = new CliConfig(configCopy);

    let fn = () => {
      c.set('project.foo', 'bar');
      c.save();
    }

    expect(fn).to.throw(Error);
  });

  it('Throws an error if try to use array method on property of type `string`', () => {
    let c = new CliConfig(configCopy);

    let fn = () => {
      c.set('project.name.push', 'new-project-name');
      c.save();
    }

    expect(fn).to.throw(Error);
  });

  it('Throws an error if try to use `number` on property of type `string`', () => {
    let c = new CliConfig(configCopy);

    let fn = () => {
      c.set('project.name', 42);
      c.save();
    }

    expect(fn).to.throw(Error);
  });

});

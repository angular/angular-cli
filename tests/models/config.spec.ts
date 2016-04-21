import {Config} from '../../addon/ng2/models/config';

const fs      = require('fs');
const path    = require('path');
const expect  = require('chai').expect;
const schema  = path.resolve(process.cwd(), 'test.json');

function getContents() {
  return JSON.parse(fs.readFileSync(schema, 'utf8'));
}

describe('Config Tests', () => {
  before(() => {
    process.chdir(process.cwd());
  });

  beforeEach(() => {
    fs.writeFileSync(schema, JSON.stringify({}), 'utf8');
  });

  afterEach(() => {
    try {
      fs.accessSync(schema);
      fs.unlinkSync(schema);
    } catch (e) { /* */ }
  });

  it('Throws an error if .json file not exists', () => {
    fs.unlinkSync(schema);

    let fn = () => {
      return new Config(schema);
    }

    expect(fn).to.throw('test.json not found.');
  });

  it('Does not throw an error if .json file exists', () => {
    let fn = () => {
      return new Config(schema);
    }

    expect(fn).to.not.throw();
  });

  it('Does save a string into config with type string', () => {
    let file = new Config(schema);
    file.config.var = 'test';

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');
    expect(json.var.value).to.be.equal('test');
  });

  it('Does save a boolean into config with type boolean', () => {
    let file = new Config(schema);
    file.config.var = true;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('boolean');
    expect(json.var.value).to.be.equal(true);
  });

  it('Does save a number into config with type number', () => {
    let file = new Config(schema);
    file.config.var = 10;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('number');
    expect(json.var.value).to.be.equal(10);
  });

  it('Does save an array into config with type array', () => {
    let file = new Config(schema);
    file.config.var = ['test'];

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.include('test');
    expect(json.var.enum).to.deep.equal(['test']);
  });

  it('Does save a object into config with type object', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value).to.deep.equal({ foo: 'bar' });
  });

  it('Does save a null into config with type null', () => {
    let file = new Config(schema);
    file.config.var = null;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('null');
    expect(json.var.value).to.be.equal(null);
  });

  it('Does save a number with type number', () => {
    let file = new Config(schema);
    file.config.var = 100;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('number');
    expect(json.var.value).to.equal(100);
  });

  it('Does update a value as type number', () => {
    let file = new Config(schema);
    file.config.var = 100;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('number');
    expect(json.var.value).to.equal(100);

    file.config.var = 200;

    file.save();

    json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('number');
    expect(json.var.value).to.equal(200);
  });

  it('Does throw if try to assign different type to a type number', () => {
    let file = new Config(schema);
    file.config.var = 100;

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('number');
    expect(json.var.value).to.equal(100);

    function test() {
      file.config.var = [];
    }

    expect(test).to.throw('Cannot assign value of type \'array\' to an property with type \'number\'');
  });

  it('Does save a string with special characters', () => {
    let file = new Config(schema);
    file.config.var = 'testABC123[]\'()ŠĐČĆŽšđčćž,.-<>!"#$%&';

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');
    expect(json.var.value).to.include('\'');
    expect(json.var.value).to.include('[]');
    expect(json.var.value).to.equal('testABC123[]\'()ŠĐČĆŽšđčćž,.-<>!"#$%&');
  });

  it('Does save a string with exact length', () => {
    let file = new Config(schema);
    file.config.var = 'abcdefghij';

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');
    expect(json.var.value).to.have.lengthOf(10);
  });

  it('Does rewrite a string with new value, stays type of string and have a new value', () => {
    let file = new Config(schema);
    file.config.var = 'test';
    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');

    file.config.var = 'bla';
    file.save();
    json = getContents();

    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');
    expect(json.var.value).to.equal('bla');    
  });

  it('Does throw if want to assign different type to a type of string', () => {
    let file = new Config(schema);
    file.config.var = 'test';
    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('string');
    expect(json.var.value).to.equal('test');

    function test() {
      file.config.var = [];
    }

    expect(test).to.throw('Cannot assign value of type \'array\' to an property with type \'string\'')
  });

  it('Does initialize an empty array via `file.config.var = []`', () => {
    let file = new Config(schema);
    file.config.var = [];

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(0);
  });

  it('Does initialize a new array with property via `file.config.var = [\'test\']`', () => {
    let file = new Config(schema);
    file.config.var = ['test'];

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(1);
    expect(json.var.enum).to.deep.includes('test');
  });

  it('Does initialize a new array with multiple properties via `file.config.var = [\'test1\', \'test2\', \'test3\']`', () => {
    let file = new Config(schema);
    file.config.var = ['test1', 'test2', 'test3'];

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(3);
    expect(json.var.enum).to.deep.includes('test1');
    expect(json.var.enum).to.deep.includes('test2');
    expect(json.var.enum).to.deep.includes('test3');
  });

  it('`push(\'test\')` works on initialized empty array', () => {
    let file = new Config(schema);
    file.config.var = [];
    file.config.var.enum.push('test');

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(1);
    expect(json.var.enum).to.deep.includes('test');
  });

  it('`push(\'test\')` works on an array with properties', () => {
    let file = new Config(schema);
    file.config.var = ['bla1', 'bla2', 'bla3'];
    file.config.var.enum.push('test');

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(4);
    expect(json.var.enum).to.deep.includes('bla1');
    expect(json.var.enum).to.deep.includes('bla2');
    expect(json.var.enum).to.deep.includes('bla3');
    expect(json.var.enum).to.deep.includes('test');
  });

  it('`push(\'test\')` creates a new array and add a value `test` to it', () => {
    let file = new Config(schema);
    file.config.var.push('test');

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(1);
    expect(json.var.enum).to.deep.includes('test');
  });

  it('Throws an error if want to assign type of string to type of array', () => {
    let file = new Config(schema);
    file.config.var = [];

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('array');
    expect(json.var.enum).to.be.array;
    expect(json.var.enum).to.have.lengthOf(0);

    function test() {
      file.config.var = 'test';
    }

    expect(test).to.throw('Cannot assign value of type \'string\' to an property with type \'array\'');
  });

  it('Does save an empty object with type object without additional properties other than type', () => {
    let file = new Config(schema);
    file.config.var = {};

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(Object.keys(json.var)).to.have.lengthOf(1);
  });

  it('Does initializes an object with properties', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar', bar: 'foo' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value.foo).to.equal('bar');
    expect(json.var.value.bar).to.equal('foo');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);
  });

  it('Does add an value to existing object', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar', bar: 'foo' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value.foo).to.equal('bar');
    expect(json.var.value.bar).to.equal('foo');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);

    file.config.var.value.test = 'bla';
    file.save();

    json = getContents();
    expect(json.var.value.test).to.be.equal('bla');
    expect(Object.keys(json.var.value)).to.have.lengthOf(3);
  });

  it('Does rewrite an existing property value with new one', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar', bar: 'foo' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value.foo).to.equal('bar');
    expect(json.var.value.bar).to.equal('foo');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);

    file.config.var.value.foo = 'test123';
    file.save();

    json = getContents();
    expect(json.var.value.foo).to.be.equal('test123');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);
  });

  it('Does delete an existing property', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar', bar: 'foo' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value.foo).to.equal('bar');
    expect(json.var.value.bar).to.equal('foo');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);

    delete file.config.var.value.foo;
    file.save();

    json = getContents();
    expect(Object.keys(json.var.value)).to.have.lengthOf(1);
  });

  it('Does throw if try to assign different type to type object', () => {
    let file = new Config(schema);
    file.config.var = { foo: 'bar', bar: 'foo' };

    file.save();

    let json = getContents();
    expect(json.var).to.be.exist;
    expect(json.var.type).to.be.equal('object');
    expect(json.var.value.foo).to.equal('bar');
    expect(json.var.value.bar).to.equal('foo');
    expect(Object.keys(json.var.value)).to.have.lengthOf(2);

    function test() {
      file.config.var = 100;
    }

    expect(test).to.throw('Cannot assign value of type \'number\' to an property with type \'object\'');
  });

});

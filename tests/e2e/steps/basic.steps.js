var chai = require('chai');
var shell = require('shelljs');

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var expect = chai.expect;

module.exports = function() {
  var _name;
  var _newOutput;
  
  this.Given(/^the name "([^"]*)"$/, function(name, cb) {
    _name = name;
    cb();
  });
  
  this.Given(/^the directory "([^"]*)"$/, function(directory, cb) {
    cb();
  });
  
  this.When(/^I create a new project$/, function(cb) {
    _newOutput = shell.exec('ng new ' + _name + ' --skip-npm --skip-git', {silent: true}).output;
    cb();
  });
  
  this.When(/^I build the project$/, function(cb) {
    cb();
  });
  
  this.When(/^I run the tests$/, function(cb) {
    cb();
  });
  
  this.When(/^I generate a component$/, function(cb) {
    cb();
  });
  
  this.Then(/^it initializes a git repository$/, function(cb) {
    cb();
  });
  
  this.Then(/^it install npm dependencies$/, function(cb) {
    cb();
  });
  
  this.Then(/^it creates the files:$/, function(files, cb) {
    var patternToCatch = /create\s(.*)/gm;
    var patternToReplace = /create\s/gm;
    var caught = _newOutput.match(patternToCatch);
    var _files = files.split(/\s/); 
    
    caught.forEach(function(item, index) {
      expect(item.replace(patternToReplace, '')).to.equal(_files[index]);
    });
    
    cb();
  });
  
  this.Then(/^it passes with:$/, function(string, cb) {
    cb();
  });
};
'use strict';

var expect = require('chai').expect;
var rewire = require('rewire');
var path = require('path');

var cli = rewire('../../../lib/cli');

function cliMock(options) {
  return options;
}

cli.__set__('cli', cliMock);

describe('Unit: CLI', function() {
  it('should override CLI options', function() {
    var expectedOptions = {
      cli: {
        name: 'ng',
        root: path.join(__dirname, '../../..'),
        npmPackage: 'angular-cli'
      }
    };

    var options = cli({});

    expect(options).to.deep.equal(expectedOptions);
  });
});

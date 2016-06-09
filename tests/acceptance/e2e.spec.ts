'use strict';

var ng = require('../helpers/ng');
var path = require('path');
var tmp = require('../helpers/tmp');
var conf = require('ember-cli/tests/helpers/conf');
var expect = require('chai').expect;
var child_process = require('child_process');
var treeKill = require('tree-kill');
var root = path.join(process.cwd(), 'tmp');

const ngBin = `node ${path.join(process.cwd(), 'bin', 'ng')}`;

describe('Acceptance ng e2e: ', function () {
  before(function () {
    this.timeout(100000);

    conf.setup();

    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    })
  });

  after(function () {
    this.timeout(100000);

    conf.restore();
    return tmp.teardown('./tmp');
  });

  it('ng e2e fails outside of angular-cli project', function () {
    this.timeout(100000);
      
    expect(ng(['e2e'])).to.throw;
  });

  it('ng e2e fails without a locally running angular-cli project', function () {
    this.timeout(240000);

    function executor(resolve, reject) {
      ng(['new', 'test-project', '--skip-npm', '--skip-bower']).then(function () {
        process.chdir(path.join(root, 'test-project'));
      }).then(function () {
          ng(['e2e']).then(function(code) {
            const exitCode = typeof code === 'number' ? code : 0;
            exitCode !== 0 ? resolve() : reject('ng e2e command closed with error');
          })
      });
    }

    return new Promise(executor)
      .then(() => {
      })
      .catch((msg) => {
        throw new Error(msg);
      });
  });
});
/*eslint-disable no-console */
'use strict';

var ng = require('../helpers/ng');
var tmp = require('../helpers/tmp');
var conf = require('ember-cli/tests/helpers/conf');
var Promise = require('ember-cli/lib/ext/promise');
var fs = require('fs');
var path = require('path');
var chai = require('chai');
var sinon = require('sinon');
var ExecStub = require('../helpers/exec-stub');
var https = require('https');
var SilentError = require('silent-error');

const expect = chai.expect;
const fsReadFile = Promise.denodeify(fs.readFile);
const fsWriteFile = Promise.denodeify(fs.writeFile);
const fsMkdir = Promise.denodeify(fs.mkdir);

describe('Acceptance: ng github-pages:deploy', function() {
  let execStub;
  let project = 'foo',
    initialBranch = 'master',
    ghPagesBranch = 'gh-pages',
    message = 'new gh-pages version',
    remote = 'origin  git@github.com:username/project.git (fetch)';

  function setupDist() {
    return fsMkdir('./dist')
      .then(() => {
        let indexHtml = path.join(process.cwd(), 'dist', 'index.html');
        let indexData = `<title>project</title>\n<base href="/">`;
        return fsWriteFile(indexHtml, indexData, 'utf8');
      });
  }

  before(conf.setup);

  after(conf.restore);

  beforeEach(function() {
    this.timeout(10000);
    return tmp.setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => ng(['new', project, '--skip-npm', '--skip-bower']))
      .then(() => setupDist())
      .then(() => execStub = new ExecStub());
  });

  afterEach(function() {
    this.timeout(10000);
    return tmp.teardown('./tmp')
      .then(() => expect(execStub.hasFailed()).to.be.false)
      .then(() => expect(execStub.hasEmptyStack()).to.be.true)
      .then(() => execStub.restore());
  });

  it('should fail with uncommited changes', function() {
    execStub.addExecSuccess('git status --porcelain', 'M dir/file.ext');
    return ng(['github-pages:deploy', '--skip-build'])
      .then(() => {
        throw new SilentError('Should fail with uncommited changes but passing.');
      }, (ret) => {
        expect(ret.name).to.equal('SilentError');
        expect(ret.isSilentError).to.equal(true);
      });
  });

  it('should deploy with defaults to existing remote', function() {
    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', remote)
      .addExecSuccess(`git checkout ${ghPagesBranch}`)
      .addExecSuccess('git add .')
      .addExecSuccess(`git commit -m "${message}"`)
      .addExecSuccess(`git checkout ${initialBranch}`)
      .addExecSuccess(`git push origin ${ghPagesBranch}:${ghPagesBranch}`)
      .addExecSuccess('git remote -v', remote);

    return ng(['github-pages:deploy', '--skip-build'])
      .then(() => {
        let indexHtml = path.join(process.cwd(), 'index.html');
        return fsReadFile(indexHtml, 'utf8');
      })
      .then((data) => expect(data.search(`<base href="/${project}/">`)).to.not.equal(-1));
  });

  it('should deploy with changed defaults', function() {
    let userPageBranch = 'master',
      message = 'not new gh-pages version';

    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', remote)
      .addExecSuccess(`git checkout ${ghPagesBranch}`)
      .addExecSuccess('git add .')
      .addExecSuccess(`git commit -m "${message}"`)
      .addExecSuccess(`git checkout ${initialBranch}`)
      .addExecSuccess(`git push origin ${ghPagesBranch}:${userPageBranch}`)
      .addExecSuccess('git remote -v', remote);

    return ng(['github-pages:deploy', '--skip-build', `--message=${message}`,
                '--user-page'])
      .then(() => {
        let indexHtml = path.join(process.cwd(), 'index.html');
        return fsReadFile(indexHtml, 'utf8');
      })
      .then((data) => expect(data.search('<base href="/">')).to.not.equal(-1));
  });

  it('should create branch if needed', function() {
    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', remote)
      .addExecError(`git checkout ${ghPagesBranch}`)
      .addExecSuccess(`git checkout --orphan ${ghPagesBranch}`)
      .addExecSuccess('git rm --cached -r .')
      .addExecSuccess('git add .gitignore')
      .addExecSuccess('git clean -f -d')
      .addExecSuccess(`git commit -m \"initial ${ghPagesBranch} commit\"`)
      .addExecSuccess('git add .')
      .addExecSuccess(`git commit -m "${message}"`)
      .addExecSuccess(`git checkout ${initialBranch}`)
      .addExecSuccess(`git push origin ${ghPagesBranch}:${ghPagesBranch}`)
      .addExecSuccess('git remote -v', remote);

    return ng(['github-pages:deploy', '--skip-build'])
      .then(() => {
        let indexHtml = path.join(process.cwd(), 'index.html');
        return fsReadFile(indexHtml, 'utf8');
      })
      .then((data) => expect(data.search(`<base href="/${project}/">`)).to.not.equal(-1));
  });

  it('should create repo if needed', function() {
    let noRemote = '',
      token = 'token',
      username = 'username';

    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', noRemote)
      .addExecSuccess(`git remote add origin git@github.com:${username}/${project}.git`)
      .addExecSuccess(`git push -u origin ${initialBranch}`)
      .addExecSuccess(`git checkout ${ghPagesBranch}`)
      .addExecSuccess('git add .')
      .addExecSuccess(`git commit -m "${message}"`)
      .addExecSuccess(`git checkout ${initialBranch}`)
      .addExecSuccess(`git push origin ${ghPagesBranch}:${ghPagesBranch}`)
      .addExecSuccess('git remote -v', remote);

    var httpsStub = sinon.stub(https, 'request', httpsRequestStubFunc);

    function httpsRequestStubFunc(req) {
      let responseCb;

      let expectedPostData = JSON.stringify({
        'name': project
      });

      let expectedReq = {
        hostname: 'api.github.com',
        port: 443,
        path: '/user/repos',
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': expectedPostData.length,
          'User-Agent': 'angular-cli-github-pages'
        }
      }

      expect(req).to.eql(expectedReq);

      return {
        on: (event, cb) => responseCb = cb,
        write: (postData) => expect(postData).to.eql(expectedPostData),
        end: () => responseCb({ statusCode: 201 })
      }
    }

    return ng(['github-pages:deploy', '--skip-build', `--gh-token=${token}`,
      `--gh-username=${username}`])
      .then(() => {
        let indexHtml = path.join(process.cwd(), 'index.html');
        return fsReadFile(indexHtml, 'utf8');
      })
      .then((data) => expect(data.search(`<base href="/${project}/">`)).to.not.equal(-1))
      .then(() => httpsStub.restore());
  });

  it('should stop deploy if create branch fails', function() {
    let noRemote = '',
      token = 'token',
      username = 'username';

    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', noRemote);

    var httpsStub = sinon.stub(https, 'request', httpsRequestStubFunc);

    function httpsRequestStubFunc(req) {
      let responseCb;

      let expectedPostData = JSON.stringify({
        'name': project
      });

      let expectedReq = {
        hostname: 'api.github.com',
        port: 443,
        path: '/user/repos',
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': expectedPostData.length,
          'User-Agent': 'angular-cli-github-pages'
        }
      }

      expect(req).to.eql(expectedReq);

      return {
        on: (event, cb) => responseCb = cb,
        write: (postData) => expect(postData).to.eql(expectedPostData),
        end: () => responseCb({ statusCode: 401, statusMessage: 'Unauthorized' })
      }
    }

    return ng(['github-pages:deploy', '--skip-build', `--gh-token=${token}`,
      `--gh-username=${username}`])
      .then(() => {
        throw new SilentError('Should not pass the deploy.');
      }, (ret) => {
        expect(ret.name).to.equal('SilentError');
        expect(ret.isSilentError).to.equal(true);
      })
      .then(() => httpsStub.restore());
  });

  it('should fail gracefully when checkout has permissions failure', function() {
    execStub.addExecSuccess('git status --porcelain')
      .addExecSuccess('git rev-parse --abbrev-ref HEAD', initialBranch)
      .addExecSuccess('git remote -v', remote)
      .addExecSuccess(`git checkout ${ghPagesBranch}`)
      .addExecSuccess('git add .')
      .addExecSuccess(`git commit -m "${message}"`)
      .addExecError(`git checkout ${initialBranch}`, 'error: cannot stat \'src/client\': Permission denied');

    return ng(['github-pages:deploy', '--skip-build'])
      .then(() => {
        throw new SilentError('Should not pass the deploy.');
      }, (ret) => {
        expect(ret.name).to.equal('SilentError');
        expect(ret.isSilentError).to.equal(true);
        expect(ret.message).to.contain('There was a permissions error');
      });
  });
});

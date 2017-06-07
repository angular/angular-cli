#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const spawnSync = require( 'child_process').spawnSync;
const fs = require('fs');
const temp = require('temp');
const { blue, green, gray } = require('chalk');

const path = require('path');
const glob = require('glob');
const cliBuilds = 'https://github.com/angular/cli-builds.git';
const ngToolsWebpackBuilds = 'https://github.com/angular/ngtools-webpack-builds.git';


class Executor {
  constructor(cwd) {
    this._cwd = cwd;
  }

  execute(command, ...args) {
    args = args.filter(x => x !== undefined);
    console.log(blue(`Running \`${command} ${args.map(x => `"${x}"`).join(' ')}\`...`));
    console.log(blue(`CWD: ${this._cwd}`));

    const runCommand = spawnSync(command, args, { cwd: this._cwd });
    if (runCommand.status === 0) {
      console.log(gray(runCommand.stdout.toString()));
      return runCommand.stdout.toString();
    } else {
      throw new Error(
        `Command returned status ${runCommand.status}. Details:\n${runCommand.stderr}`);
    }
  }

  git(...args) {
    return this.execute('git', ...args);
  }
  npm(...args) {
    return this.execute('npm', ...args);
  }
  rm(...args) {
    return this.execute('rm', ...args);
  }

  glob(pattern, options) {
    return glob.sync(pattern, Object.assign({}, options || {}, { cwd: this._cwd }));
  }

  cp(root, destRoot) {
    function mkdirp(p) {
      if (fs.existsSync(p)) {
        return;
      }
      mkdirp(path.dirname(p));
      fs.mkdirSync(p);
    }

    this.glob(path.join(root, '**/*'), { nodir: true })
      .forEach(name => {
        const src = name;
        const dest = path.join(destRoot, src.substr(root.length));

        mkdirp(path.dirname(dest));
        fs.writeFileSync(dest, fs.readFileSync(src));
      });
  }

  read(p) {
    return fs.readFileSync(path.join(this._cwd, p), 'utf-8');
  }
  write(p, content) {
    fs.writeFileSync(path.join(this._cwd, p), content);
  }

  updateVersion(hash) {
    const packageJson = JSON.parse(this.read('package.json'));
    packageJson.version = `${packageJson.version}-${hash}`;
    this.write('package.json', JSON.stringify(packageJson, null, 2));
  }

  updateDependencies(hash) {
    const packageJson = JSON.parse(this.read('package.json'));
    packageJson.dependencies['@ngtools/webpack'] = ngToolsWebpackBuilds + '#' + hash;
    this.write('package.json', JSON.stringify(packageJson, null, 2));
  }
}


function main() {
  const cliPath = process.cwd();
  const cliExec = new Executor(cliPath);
  const tempRoot = temp.mkdirSync('angular-cli-builds');
  const tempExec = new Executor(tempRoot);

  const branchName = process.env['TRAVIS_BRANCH'];

  console.log(green('Cloning builds repos...\n'));
  tempExec.git('clone', cliBuilds);
  tempExec.git('clone', ngToolsWebpackBuilds);

  console.log(green('Building...'));

  const cliBuildsRoot = path.join(tempRoot, 'cli-builds');
  const cliBuildsExec = new Executor(cliBuildsRoot);
  const ngToolsWebpackBuildsRoot = path.join(tempRoot, 'ngtools-webpack-builds');
  const ngToolsWebpackBuildsExec = new Executor(ngToolsWebpackBuildsRoot);

  cliExec.npm('run', 'build');

  const message = cliExec.git('log', '--format=%h %s', '-n', '1');
  const hash = message.split(' ')[0];

  console.log(green('Copying ng-tools-webpack-builds dist'));
  ngToolsWebpackBuildsExec.git('checkout', '-B', branchName);
  ngToolsWebpackBuildsExec.rm('-rf', ...ngToolsWebpackBuildsExec.glob('*'));
  cliExec.cp('dist/@ngtools/webpack', ngToolsWebpackBuildsRoot);
  console.log(green('Updating package.json version'));
  ngToolsWebpackBuildsExec.updateVersion(hash);
  ngToolsWebpackBuildsExec.git('add', '-A');
  ngToolsWebpackBuildsExec.git('commit', '-m', message);
  ngToolsWebpackBuildsExec.git('tag', hash);

  ngToolsWebpackBuildsExec.git('config', 'credential.helper', 'store --file=.git/credentials');
  ngToolsWebpackBuildsExec.write('.git/credentials',
      `https://${process.env['GITHUB_ACCESS_TOKEN']}@github.com`);


  console.log(green('Copying cli-builds dist'));
  cliBuildsExec.git('checkout', '-B', branchName);
  cliBuildsExec.rm('-rf', ...cliBuildsExec.glob('*'));
  cliExec.cp('dist/@angular/cli', cliBuildsRoot);

  console.log(green('Updating package.json version'));
  cliBuildsExec.updateVersion(hash);
  cliBuildsExec.updateDependencies(hash);

  cliBuildsExec.git('add', '-A');
  cliBuildsExec.git('commit', '-m', message);
  cliBuildsExec.git('tag', hash);

  cliBuildsExec.git('config', 'credential.helper', 'store --file=.git/credentials');
  cliBuildsExec.write('.git/credentials',
    `https://${process.env['GITHUB_ACCESS_TOKEN']}@github.com`);

  console.log(green('Done. Pushing...'));
  ngToolsWebpackBuildsExec.git('push', '-f', 'origin', branchName);
  ngToolsWebpackBuildsExec.git('push', '--tags', 'origin', branchName);
  cliBuildsExec.git('push', '-f', 'origin', branchName);
  cliBuildsExec.git('push', '--tags', 'origin', branchName);
}

main();

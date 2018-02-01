#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const { packages } = require('../../lib/packages');
const { yellow } = require('chalk');
const fs = require('fs');
const http = require('http');
const path = require('path');
const semver = require('semver');
const spawn = require('child_process').spawn;

function _exec(options, cmd, args) {
  let stdout = '';
  let stderr = '';
  const cwd = options.cwd || process.cwd();

  args = args.filter(x => x !== undefined);
  const spawnOptions = { cwd };

  if (process.platform.startsWith('win')) {
    args.unshift('/c', cmd);
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }

  const childProcess = spawn(cmd, args, spawnOptions);
  childProcess.stdout.on('data', (data) => {
    stdout += data.toString('utf-8');
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.log('  ' + line));
  });
  childProcess.stderr.on('data', (data) => {
    stderr += data.toString('utf-8');
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.error(yellow('  ' + line)));
  });

  // Create the error here so the stack shows who called this function.
  const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);
  return new Promise((resolve, reject) => {
    childProcess.on('exit', (error) => {
      if (!error) {
        resolve({ stdout, stderr });
      } else {
        err.message += `${error}...\n\nSTDOUT:\n${stdout}\n`;
        reject(err);
      }
    });
  });
}



Promise.resolve()
  .then(() => {
    // Login into NPM.
    const NpmToken = process.env['NPM_TOKEN'];
    if (!NpmToken) {
      throw new Error('Need an NPM_TOKEN to be able to log into NPM.');
    }

    fs.writeFileSync(path.join(process.env['HOME'], '.npmrc'),
      `//registry.npmjs.org/:_authToken=${NpmToken}\n`);
  })
  // .then(() => runTool('publish', 'build'))
  .then(() => Promise.all(Object.keys(packages).map(name => {
    const pkg = packages[name];
    const version = require(pkg.packageJson).version;
    const cwd = pkg.dist;

    return new Promise((resolve, reject) => {
      const url = `http://registry.npmjs.org/${name.replace(/\//g, '%2F')}`;
      const request = http.request(url, response => {
        let data = '';

        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          const json = JSON.parse(data);
          resolve(json);
        });
        response.on('error', err => reject(err));
      });

      request.end();
    })
      .then(json => {
        // Verify that the package is newer that latest, minor or next, or skip.  This promise
        // will release with an array of dist-tags.
        if (json['name'] !== name) {
          return null;
        }
        const { latest, next } = json['dist-tags'];
        const isNext = semver.eq(version, next);
        const gtNext = semver.gt(version, next);
        const isLatest = semver.eq(version, latest);

        if (isNext || isLatest) {
          return null;
        } else if (gtNext) {
          return 'next';
        } else {
          return 'latest';
        }
      })
      .then(distTag => {
        if (!distTag) {
          return;
        }

        console.log(`Publishing ${name} @ ${version}...`);
        return _exec({ cwd }, 'npm', ['publish', '--tag', distTag]);
      });
  })))
  .then(() => {
    fs.writeFileSync(path.join(process.env['HOME'], '.npmrc'), '');
  }, err => {
    fs.writeFileSync(path.join(process.env['HOME'], '.npmrc'), '');
    console.error(err);
    process.exit(1);
  });

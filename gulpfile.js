/* jshint node:true */

/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

var gulp = require('gulp');
var path = require('path');
var batter  = require('./scripts/batter');
batter.whip(gulp, {
  paths: {
    preboot: {
      server: path.join(__dirname, '/dist/modules/preboot/server'),
      dest: path.join(__dirname, './examples/preboot_basic')
    },
    changelog: {
      filename: path.join(__dirname, 'CHANGELOG.md')
    }
  }
});

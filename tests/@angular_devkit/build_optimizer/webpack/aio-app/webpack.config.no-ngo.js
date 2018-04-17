/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const path = require('path');

const config = require('./webpack.config.common.js');


const dist = path.resolve(__dirname, 'dist-no-ngo/');

config.output.path = dist;
config.module.rules.push({ test: /\.ts$/, loader: '@ngtools/webpack' })

module.exports = config;
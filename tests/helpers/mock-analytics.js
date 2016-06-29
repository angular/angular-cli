// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
'use strict';

module.exports = MockAnalytics;
function MockAnalytics() {
  this.tracks = [];
  this.trackTimings = [];
  this.trackErrors = [];
}

MockAnalytics.prototype = Object.create({});
MockAnalytics.prototype.track = function(arg) {
  this.tracks.push(arg);
};

MockAnalytics.prototype.trackTiming = function(arg) {
  this.trackTimings.push(arg);
};

MockAnalytics.prototype.trackError = function(arg) {
  this.trackErrors.push(arg);
};

MockAnalytics.prototype.constructor = MockAnalytics;

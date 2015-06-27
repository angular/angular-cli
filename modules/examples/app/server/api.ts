/// <reference path="../../../server/typings/tsd.d.ts" />
'use strict';
var express = require('express');

module.exports = function(ROOT) {

  var router = express.Router();

  router.route('/todos')
    .get(function(req, res) {
      console.log('GET');
      res.json({
        title: 'http async',
        completed: false
      });
    })
  router.route('/todos/:todo_id')
    .post(function(req, res) {
      console.log('POST');
      res.json(null);
    })
    .put(function(req, res) {
      console.log('PUT');
      res.json(null);
    })
    .delete(function(req, res) {
      console.log('DELETE');
      res.json(null);
    });

  return router;
}

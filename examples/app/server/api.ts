/// <reference path="../../../custom_typings/_custom.d.ts" />

var util = require('util');
var {Router} = require('express');


var count = 4;
var todos = [
  { id: 0, value: 'finish example', created_at: new Date(), completed: false },
  { id: 1, value: 'add tests',      created_at: new Date(), completed: false },
  { id: 2, value: 'include development environment', created_at: new Date(), completed: false },
  { id: 3, value: 'include production environment',  created_at: new Date(), completed: false }
];

module.exports = function(ROOT) {

  var router = Router();


  router.route('/todos')
    .get(function(req, res) {
      console.log('GET');
      res.json(todos);
    })
    .post(function(req, res) {
      console.log('POST', util.inspect(req.body, {colors: true}));
      var todo = req.body;
      if (todo) {
        todos.push({
          value: todo.value,
          created_at: new Date(),
          completed: todo.completed,
          id: count++
        });
        res.json(todo);
      } else {
        res.end();
      }
    });

  router.param('todo_id', function(req, res, next, todo_id) {
    var id = Number(req.params.todo_id);
    try {
      var todo = todos[id];
      req.todo_id = id;
      req.todo = todos[id];
      next();
    } catch (e) {
      next(new Error('failed to load todo'));
    }
  });

  router.route('/todos/:todo_id')
    .get(function(req, res) {
      console.log('GET', util.inspect(req.todo, {colors: true}));

      res.json(req.todo);
    })
    .put(function(req, res) {
      console.log('PUT', util.inspect(req.body, {colors: true}));

      var index = todos.indexOf(req.todo);
      var todo = todos[index] = req.body;

      res.json(todo);
    })
    .delete(function(req, res) {
      console.log('DELETE', req.todo_id);

      var index = todos.indexOf(req.todo);
      todos.splice(index, 1);

      res.json(req.todo);
    });

  return router;
};

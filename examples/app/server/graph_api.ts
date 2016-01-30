var util = require('util');
var falcorExpress = require('falcor-express');
var {Router} = require('express');
var falcorRouter = require('falcor-router');


var COUNT = 4;
var TODOS = [
  { id: 0, value: 'finish example', created_at: new Date(), completed: false },
  { id: 1, value: 'add tests',      created_at: new Date(), completed: false },
  { id: 2, value: 'include development environment', created_at: new Date(), completed: false },
  { id: 3, value: 'include production environment',  created_at: new Date(), completed: false }
];
module.exports = function(ROOT) {

  var router = Router();

  router.use('/todos', falcorExpress.dataSourceRoute(function(req, res) {
    return new falcorRouter([
      {
        route: 'all',
        get: function() {
          console.log('GET');
          return {path: ['all'], value: TODOS};
        }
      },
      {
        route: 'all',
        set: function(jsonGraphArg) {
          TODOS = jsonGraphArg.all;
          return {path: ['all'], value: TODOS};
        }
      },
      {
        route: 'todo',
        get: function(pathSet) {
          var id = Number(pathSet.todo);

          try {
            var todo = TODOS[id];
            return {path: ['todo'], value: todo};
          } catch (e) {
            throw new Error('failed to load todo');
          }
        }
      },
      {
        route: 'todo.push',
        call: function(callPath, args) {
          var todo = args[0];
          TODOS.push(todo);

          return {path: ['all'], value: todo};
        }
      },
      {
        route: 'todo.id.remove',
        call: function(callPath, args) {
          var id = args[0];
          var i = TODOS.length;

          while (i--) {
            if (TODOS[i].id === id) { break; }
          }

          if (i > -1) {
            var todo = TODOS.splice(i, 1)[0];
            return {path: ['todo'], value: todo};
          }

          throw new Error ('failed to delete todo');
        }
      }
    ]);
  }));

  return router;
};

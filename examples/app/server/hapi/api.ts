var util = require('util');

var TODOS = [
  { id: 0, value: 'finish example', created_at: new Date(), completed: false },
  { id: 1, value: 'add tests',      created_at: new Date(), completed: false },
  { id: 2, value: 'include development environment', created_at: new Date(), completed: false },
  { id: 3, value: 'include production environment',  created_at: new Date(), completed: false }
];
var COUNT = TODOS.length;

module.exports = function(ROOT) {

  function findById(todo_id: number): any[] {
    var id = Number(todo_id);
    return TODOS[id];
  }

  return [{
    method: 'GET',
    path: '/api/todos',
    handler: (request, reply) => {
      console.log('GET');
      // 70ms latency
      setTimeout(function() {
        reply(TODOS);
      }, 0);
    }
  }, {
    method: 'POST',
    path: '/api/todos',
    handler: (request, reply) => {
      console.log('POST', util.inspect(request.payload, {colors: true}));
      var todo = request.payload;
      if (todo) {
        TODOS.push({
          value: todo.value,
          created_at: new Date(),
          completed: todo.completed,
          id: COUNT++
        });
        return reply(todo);
      }
    }
  }, {
    method: 'GET',
    path: '/api/todos/{todo_id}',
    handler: (request, reply) => {
      console.log('GET', util.inspect(request.todo, {colors: true}));

      res.json(findById(request.params.todo_id));
    }
  }, {
    method: 'PUT',
    path: '/api/todos/{todo_id}',
    handler: (request, reply) => {
      console.log('PUT', util.inspect(request.payload, {colors: true}));

      var index = TODOS.indexOf(findById(request.params.todo_id));
      TODOS[index] = request.payload;

      reply(TODOS[index]);
    }
  },{
    method: 'DELETE',
    path: '/api/todos/{todo_id}',
    handler: (request, reply) => {
      console.log('DELETE', request.params.todo_id);

      var index = TODOS.indexOf(findById(request.params.todo_id));
      TODOS.splice(index, 1);

      reply(TODOS);
    }
  }];
};

/// <reference path="../../../../custom_typings/_custom.d.ts" />
// import {bootstrap} from '../../angular2_client/bootstrap-defer';
import {
  bootstrap,
  ViewEncapsulation,
  Component,
  View,
  Directive,
  ElementRef,
  bind,
  Inject,
  CORE_DIRECTIVES
} from 'angular2/angular2';
import {ROUTER_PROVIDERS, ROUTER_DIRECTIVES} from 'angular2/router';

import {Http, HTTP_PROVIDERS} from 'angular2/http';
import {
  NG_PRELOAD_CACHE_PROVIDERS,
  PRIME_CACHE
} from '../../../../modules/universal/client/client';


import {Store, Todo, TodoFactory} from './services/TodoStore';

@Component({
  selector: 'app',
  bindings: [ Store, TodoFactory ]
})
@View({
  encapsulation: ViewEncapsulation.None,
  directives: [ CORE_DIRECTIVES, ROUTER_DIRECTIVES ],
  styles: [],
  template: `
<section id="todoapp">

  <header id="header">
    <h1>todos</h1>
      <input
        type="text"
        id="new-todo"
        placeholder="What needs to be done?"
        autofocus
        #newtodo
        (keyup)="enterTodo($event, newtodo)">
  </header>

  <section id="main">
    <input
      id="toggle-all"
      type="checkbox"
      (click)="toggleAll($event)"
      [class.hidden]="todoStore.list.length == 0">
    <label for="toggle-all">Mark all as complete</label>

    <ul id="todo-list">

      <li
        *ng-for="var todo of todoStore.list"
        [class.editing]="todoEdit == todo"
        [class.completed]="todo.completed == true">

        <div class="view"
            [class.hidden]="todoEdit == todo">

          <input class="toggle"
                 type="checkbox"
                 (click)="completeMe(todo)"
                 [checked]="todo.completed">

          <label (dblclick)="editTodo(todo)">{{ todo.title }}</label>
          <button class="destroy" (click)="deleteMe(todo)"></button>

        </div>

        <div *ng-if="todoEdit == todo">

          <input class="edit"
            [class.visible]="todoEdit == todo"
            [value]="todo.title"
            (keyup)="doneEditing($event, todo)"
            autofocus>

        </div>

      </li>
    </ul>
  </section>

  <footer id="footer" *ng-if="todoStore.list.length">
    <span id="todo-count">
      <strong>{{ remainingCount() }}</strong>
      {{ pluralize(remainingCount(), 'item') }} left
    </span>
    <ul id="filters">
      <li>
        <a href="/#/"
          [class.selected]="selected === 0"
          (click)="selected = 0">
          All
        </a>
      </li>
      <li>
        <a href="/#/active"
          [class.selected]="selected === 1"
          (click)="selected = 1">
          Active
        </a>
      </li>
      <li>
        <a href="/#/completed"
          [class.selected]="selected === 2"
          (click)="selected = 2">
          Completed
        </a>
      </li>
    </ul>
    <button id="clear-completed" (click)="clearCompleted()">Clear completed</button>
  </footer>

</section>
  `
})
export class TodoApp {
  todoEdit: Todo = null;
  selected: number = 0;
  constructor(public todoStore: Store, public factory: TodoFactory) {
  }

  onInit() {
    this.addTodo('Universal JavaScript');
    this.addTodo('Run Angular 2 in Web Workers');
    this.addTodo('Upgrade the web');
    this.addTodo('Release Angular 2');
  }

  enterTodo($event, inputElement) {
    if (!inputElement.value) { return; }
    if ($event.which !== 13) { return; }
    this.addTodo(inputElement.value);
    inputElement.value = '';
  }

  editTodo(todo: Todo) {
    this.todoEdit = todo;
  }

  doneEditing($event, todo: Todo) {
    var which = $event.which;
    var target = $event.target;

    if (which === 13) {
      todo.title = target.value;
      this.todoEdit = null;
    } else if (which === 27) {
      this.todoEdit = null;
      target.value = todo.title;
    }

  }

  addTodo(newTitle: string) {
    this.todoStore.add(this.factory.create(newTitle, false));
  }

  completeMe(todo: Todo) {
    todo.completed = !todo.completed;
  }

  deleteMe(todo: Todo) {
    this.todoStore.remove(todo);
  }

  toggleAll($event) {
    var isComplete = $event.target.checked;
    this.todoStore.list.forEach((todo: Todo) => todo.completed = isComplete);
  }

  clearCompleted() {
    this.todoStore.removeBy(todo => todo.completed);
  }

  pluralize(count, word) {
    return word + (count === 1 ? '' : 's');
  }

  remainingCount() {
    return this.todoStore.list.filter((todo: Todo) => !todo.completed).length;
  }
}



export function main() {
  return bootstrap(TodoApp, [
    ROUTER_PROVIDERS,
    HTTP_PROVIDERS,
    NG_PRELOAD_CACHE_PROVIDERS,
    bind(PRIME_CACHE).toValue(true)
  ]);
}

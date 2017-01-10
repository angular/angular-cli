# Include AngularFire

[Firebase](https://firebase.google.com/) is a mobile and web application platform with tools and infrastructure designed
to help developers build high-quality apps.

#### Create new project

Create a new project and navigate into the project.

```bash
$ ng new my-app
$ cd my-app
```

#### Install dependencies

In the new project you need to install the required dependencies.

```bash
$ npm install --save angularfire2 firebase
```

#### Get Firebase configuration details

In order to connect AngularFire to Firebase we need to get the configuration details.

Firebase offers an easy way to get this, by showing a JavaScript object that you can copy and paste.

- Log in to the [Firebase](https://firebase.google.com) console.
- Create New Project or open an existing one.
- Click `Add Firebase to your web app`.
- From the modal window that pops up you copy the `config` object.

```javascript
  var config = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    databaseURL: "your-database-url",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-message-sender-id"
  };
```

#### Create FirebaseModule

We need a way to store these configuration details in our app. We do this by creating a module.

Create a new file `src/app/firebase.ts` with the content below and pass in the variables you retrieved from Firebase.

```typescript
import { AngularFireModule, AuthMethods } from 'angularfire2';
import { FirebaseAppConfig } from 'angularfire2/interfaces';
import { AuthConfiguration } from 'angularfire2/auth';

const config: FirebaseAppConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-auth-domain',
  databaseURL: 'your-database-url',
  storageBucket: 'your-storage-bucket',
};

const authConfig: AuthConfiguration = {
  method: AuthMethods.Popup,
};

export const FirebaseModule = AngularFireModule.initializeApp(config, authConfig);
```

#### Import FirebaseModule

In `src/app/app.module.ts` we need to reference the FirebaseModule so it gets imported in our app.

On the top of the file you import the module from the file created in the previous step. In the array of imports you
reference the module.

```typescript
/* other imports */
import { FirebaseModule } from './firebase';

@NgModule({
  ...
  imports: [
    ...
    FirebaseModule
  ]
  ...
})

```


# W.I.P.

#### Use Firebase in your components

```typescript
import { Component } from '@angular/core';
import { AngularFire, FirebaseListObservable } from 'angularfire2';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Firebase TODO';

  public todos: FirebaseListObservable<any[]>;

  constructor(
    private af: AngularFire
  ) {
    this.todos = af.database.list('/todos');
  }

  addTodo(name) {
    this.todos.push({ name: name.value, done: false });
    name.value = null;
  }

  toggleDone(todo) {
    this.todos.update(todo, { done: !todo.done });
  }

  removeTodo(todo) {
    this.todos.remove(todo);
  }
}

```


```html
<h1>
  {{title}}
</h1>

<form (submit)="addTodo(name)">
  <input type="text" #name placeholder="Name">
  <button type="submit">Add</button>
</form>

<ul>
  <li *ngFor="let todo of todos | async">
    <span [ngStyle]="{'text-decoration': todo.done ? 'line-through' : ''}">
      {{todo.name}}
    </span>
    <a href="#" (click)="removeTodo(todo)">Delete</a>
    <a href="#" (click)="toggleDone(todo)">Done</a>
  </li>
</ul>
```
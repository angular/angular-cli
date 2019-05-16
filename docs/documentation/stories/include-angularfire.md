<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is deprecated and we no longer accept PRs to improve this.**

# Include AngularFire

[Firebase](https://firebase.google.com/) is a mobile and web application platform with tools and infrastructure designed
to help developers build high-quality apps. [AngularFire2](https://github.com/angular/angularfire2) is the official
Angular library to use Firebase in your apps.

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

In order to connect AngularFire to Firebase you need to get the configuration details.

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

#### Configure the Environment

These configuration details need to be stored in our app, one way to do this using the `environment`. This allows you to
use different credentials in development and production.

Open `src/environments/environment.ts` and add a key `firebase` to the exported constant:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'your-api-key',
    authDomain: 'your-auth-domain',
    databaseURL: 'your-database-url',
    storageBucket: 'your-storage-bucket',
  }
};
```

To define the keys for production you need to update `src/environments/environment.prod.ts`.

#### Import and load FirebaseModule

The final step is to import `AngularFireModule` and initialize it using the parameters from the `environment`.

Open `src/app/app.module.ts` and add the following lines on the top of the file, with the other imports:

```typescript
import { AngularFireModule } from 'angularfire2';
import { environment } from '../environments/environment';
```

To initialize AngularFire add the following line to the `imports` array inside the `NgModule`:

```typescript
@NgModule({
  // declarations
  imports: [
    // BrowserModule, etc
    AngularFireModule.initializeApp(environment.firebase),
  ]
  // providers
  // bootstrap
})
```

#### Congratulations, you can now use Firebase in your Angular app!

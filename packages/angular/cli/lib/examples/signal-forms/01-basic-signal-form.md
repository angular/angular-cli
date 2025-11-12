---
title: Basic Signal Form
summary: Creates a reactive link between a WritableSignal data model and native HTML inputs using the `form()` function and `[control]` directive.
keywords:
  - signal forms
  - form
  - control
  - basic example
  - submit
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to create a reactive, two-way link between a component's data model and its template. The problem it solves is keeping the state of the UI (the form inputs) perfectly synchronized with the application's state (the signal model) without manual state management, ensuring data consistency at all times.

## When to Use

Use this pattern as the starting point for any new form in an Angular application. It is the modern, preferred way to handle forms, superseding the traditional `FormsModule` (`NgModel`) and `ReactiveFormsModule` (`FormGroup`, `FormControl`) for most use cases by offering better type safety and a more reactive, signal-based architecture.

## Key Concepts

- **`form()`:** A function that creates a `Field` representing the form, taking a `WritableSignal` as the data model.
- **`[control]` directive:** Binds a `Field` from your component to a native HTML input element, creating a two-way data binding.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component that defines and manages a user profile form.

### user-profile.component.ts

This file defines the component's logic, including the signal-based data model and the form structure.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, submit, Control } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-user-profile',
  imports: [JsonPipe, Control],
  templateUrl: './user-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent {
  readonly submitted = output<UserProfile>();

  profileModel = signal<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
  });

  profileForm = form(this.profileModel);

  async handleSubmit() {
    // For this basic example, we assume the form is always valid for submission.
    // See the validation example for how to handle invalid forms.
    await submit(this.profileForm, async () => {
      this.submitted.emit(this.profileForm().value());
    });
  }
}
```

### user-profile.component.html

The template is wrapped in a `<form>` tag with a `(submit)` event and a submit button.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      First Name:
      <input type="text" [control]="profileForm.firstName" />
    </label>
  </div>
  <div>
    <label>
      Last Name:
      <input type="text" [control]="profileForm.lastName" />
    </label>
  </div>
  <div>
    <label>
      Email:
      <input type="email" [control]="profileForm.email" />
    </label>
  </div>

  <button type="submit">Submit</button>
</form>

<h3>Live Form Value:</h3>
<pre>{{ profileForm().value() | json }}</pre>
```

## Usage Notes

- The `[control]` directive automatically handles the two-way data binding between the input element and the corresponding `Field` in the `profileForm`.
- The `profileForm()` signal gives you access to the `FieldState`, which includes the form's `value` as a signal.
- The native `(submit)` event on the `<form>` element is bound to the `handleSubmit` method. It's important to call `$event.preventDefault()` to prevent a full page reload.
- The `handleSubmit` method uses the `submit()` helper to manage the submission process.

## How to Use This Example

The parent component imports the `UserProfile` interface and listens for the `(submitted)` event to receive the strongly-typed form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { UserProfileComponent, UserProfile } from './user-profile.component';

@Component({
  selector: 'app-root',
  imports: [UserProfileComponent, JsonPipe],
  template: `
    <h1>User Profile</h1>
    <app-user-profile (submitted)="onProfileSubmit($event)"></app-user-profile>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: UserProfile | null = null;

  onProfileSubmit(data: UserProfile) {
    this.submittedData = data;
    console.log('Profile data submitted:', data);
  }
}
```

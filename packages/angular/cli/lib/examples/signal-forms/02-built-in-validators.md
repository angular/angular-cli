---
title: Signal Form with Built-in Validators
summary: Demonstrates how to use the suite of built-in validators like `required`, `minLength`, `email`, and `pattern` within a signal form schema.
keywords:
  - signal forms
  - validation
  - built-in validators
  - required
  - minLength
  - maxLength
  - min
  - max
  - email
  - pattern
  - schema
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to apply common, standard validation rules to form fields with minimal boilerplate. It solves the problem of repeatedly implementing frequent checks (e.g., for required fields, email formats, or length constraints) by providing a pre-built, configurable, and optimized set of validators.

## When to Use

Use this pattern as the primary method for applying common validation logic in your signal forms. These built-in functions should be your first choice before writing custom validators, as they cover the vast majority of real-world validation scenarios. They are the modern, signal-based equivalent of the static methods on the `Validators` class from `@angular/forms`.

## Key Concepts

- **`required()`:** A built-in validator that ensures a field has a value.
- **`minLength(number)`:** A built-in validator that ensures a string's length is at least the specified minimum.
- **`email()`:** A built-in validator that checks if a string is in a valid email format.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component that defines and manages a user settings form with built-in validators.

### user-settings.component.ts

This file defines the component's logic, including the data model and a validation schema that uses multiple built-in validators.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, submit, Control } from '@angular/forms/signals';
import { required, minLength, maxLength, min, max, email, pattern } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface UserSettings {
  username: string;
  age: number;
  email: string;
  website: string;
}

const settingsSchema = schema<UserSettings>((form) => {
  required(form.username);
  minLength(form.username, 3);
  maxLength(form.username, 20);

  required(form.age);
  min(form.age, 18);
  max(form.age, 100);

  required(form.email);
  email(form.email);

  pattern(form.website, /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);
});

@Component({
  selector: 'app-user-settings',
  imports: [JsonPipe, Control],
  templateUrl: './user-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSettingsComponent {
  readonly submitted = output<UserSettings>();

  settingsModel = signal<UserSettings>({
    username: '',
    age: 18,
    email: '',
    website: '',
  });

  settingsForm = form(this.settingsModel, settingsSchema);

  async handleSubmit() {
    await submit(this.settingsForm, async () => {
      this.submitted.emit(this.settingsForm().value());
    });
  }
}
```

### user-settings.component.html

This file provides the template for the form, displaying specific error messages for each potential validation failure.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>Username:</label>
    <input type="text" [control]="settingsForm.username" />
    @if (settingsForm.username().errors().length > 0) {
    <div class="errors">
      @for (error of settingsForm.username().errors(); track error) { @switch (error.kind) { @case
      ('required') {
      <p>Username is required.</p>
      } @case ('minLength') {
      <p>Username must be at least 3 characters.</p>
      } @case ('maxLength') {
      <p>Username cannot exceed 20 characters.</p>
      } } }
    </div>
    }
  </div>

  <div>
    <label>Age:</label>
    <input type="number" [control]="settingsForm.age" />
    @if (settingsForm.age().errors().length > 0) {
    <div class="errors">
      @for (error of settingsForm.age().errors(); track error) { @switch (error.kind) { @case
      ('required') {
      <p>Age is required.</p>
      } @case ('min') {
      <p>You must be at least 18 years old.</p>
      } @case ('max') {
      <p>Age cannot be more than 100.</p>
      } } }
    </div>
    }
  </div>

  <div>
    <label>Email:</label>
    <input type="email" [control]="settingsForm.email" />
    @if (settingsForm.email().errors().length > 0) {
    <div class="errors">
      @for (error of settingsForm.email().errors(); track error) { @switch (error.kind) { @case
      ('required') {
      <p>Email is required.</p>
      } @case ('email') {
      <p>Please enter a valid email address.</p>
      } } }
    </div>
    }
  </div>

  <div>
    <label>Website:</label>
    <input type="url" [control]="settingsForm.website" />
    @if (settingsForm.website().errors().length > 0) {
    <div class="errors">
      @for (error of settingsForm.website().errors(); track error) { @switch (error.kind) { @case
      ('pattern') {
      <p>Please enter a valid URL.</p>
      } } }
    </div>
    }
  </div>

  <button type="submit">Save Settings</button>
</form>
```

## Usage Notes

- All built-in validators are imported directly from `@angular/forms`.
- The native `(submit)` event on the `<form>` element is bound to the `handleSubmit` method. It's important to call `$event.preventDefault()` to prevent a full page reload.
- The `handleSubmit` method uses the `submit()` helper to manage the submission process.

## How to Use This Example

The parent component listens for the `(submitted)` event to receive the validated form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { UserSettingsComponent, UserSettings } from './user-settings.component';

@Component({
  selector: 'app-root',
  imports: [UserSettingsComponent, JsonPipe],
  template: `
    <h1>User Settings</h1>
    <app-user-settings (submitted)="onFormSubmit($event)"></app-user-settings>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: UserSettings | null = null;

  onFormSubmit(data: UserSettings) {
    this.submittedData = data;
    console.log('Settings data submitted:', data);
  }
}
```

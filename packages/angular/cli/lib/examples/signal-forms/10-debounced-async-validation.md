---
title: Debounced Asynchronous Validation
summary: Implements a debounced asynchronous validator for a signal form field to prevent excessive network requests while the user is typing.
keywords:
  - signal forms
  - validation
  - asynchronous validation
  - async
  - validateAsync
  - debounce
  - rxjs
  - submit
required_packages:
  - '@angular/forms'
  - 'rxjs'
related_concepts:
  - 'signals'
  - 'rxjs'
experimental: true
---

## Purpose

The purpose of this pattern is to create a performant and user-friendly asynchronous validation experience. It solves the problem of sending a network request on every single keystroke, which can overload a backend server and result in a sluggish UI.

## When to Use

Use this pattern for any asynchronous validation that is tied to user input, such as checking for a unique username, validating an address, or verifying a coupon code. Debouncing ensures that the validation logic only runs after the user has paused typing for a specified duration.

## Key Concepts

- **`validateAsync()`:** The function used to add an asynchronous validator.
- **RxJS `Subject` and `switchMap`:** Used to create an observable stream of user input. `switchMap` is crucial for canceling previous pending requests when new input arrives.
- **RxJS `debounceTime`:** An operator that waits for a specified period of silence in the observable stream before emitting the latest value.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component and a service that work together to perform debounced asynchronous validation.

### registration-form.component.ts

This file defines the component's logic, using an RxJS `Subject` to debounce user input before triggering async validation.

```typescript
import {
  Component,
  inject,
  OnDestroy,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { form, schema, validate, validateAsync, submit, Control } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { UsernameService } from './username.service';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, switchMap, takeUntil } from 'rxjs/operators';

export interface RegistrationForm {
  username: string;
}

@Component({
  selector: 'app-registration-form',
  imports: [JsonPipe, Control],
  templateUrl: './registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent implements OnDestroy {
  readonly submitted = output<RegistrationForm>();

  private usernameService = inject(UsernameService);
  private destroy$ = new Subject<void>();

  private username$ = new Subject<string>();
  private validationResult$ = this.username$.pipe(
    debounceTime(300),
    switchMap((username) => this.usernameService.isUsernameTaken(username)),
    takeUntil(this.destroy$),
  );

  registrationModel = signal<RegistrationForm>({ username: '' });
  registrationForm = form(this.registrationModel, this.createSchema());

  private createSchema() {
    return schema<RegistrationForm>((form) => {
      validate(form.username, ({ value }) => (value() === '' ? { required: true } : null));
      validateAsync(form.username, async ({ value }) => {
        if (value() === '') return null;
        this.username$.next(value());
        const isTaken = await firstValueFrom(this.validationResult$);
        return isTaken ? { unique: true } : null;
      });
    });
  }

  async handleSubmit() {
    await submit(this.registrationForm, async () => {
      this.submitted.emit(this.registrationForm().value());
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### registration-form.component.html

This file provides the template for the form, showing how to disable the submit button while validation is in progress.

```html
<form (submit)="handleSubmit(); $event.preventDefault()">
  <div>
    <label>
      Username:
      <input type="text" [control]="registrationForm.username" />
    </label>
    @if (registrationForm.username().pending()) {
    <p>Checking availability...</p>
    } @if (registrationForm.username().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.username().errors(); track error) { @if (error.required) {
      <p>Username is required.</p>
      } @if (error.unique) {
      <p>This username is already taken.</p>
      } }
    </div>
    }
  </div>

  <button type="submit" [disabled]="!registrationForm().valid() || registrationForm().pending()">
    Submit
  </button>
</form>
```

## Usage Notes

- The submit button is disabled when `registrationForm().pending()` is true to prevent submission while async validation is in flight.
- `firstValueFrom` (from RxJS) is used to convert the result of the observable pipeline back into a `Promise` for the `validateAsync` function.

## How to Use This Example

The parent component listens for the `(submitted)` event and receives the strongly-typed form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RegistrationFormComponent, RegistrationForm } from './registration-form.component';

@Component({
  selector: 'app-root',
  imports: [RegistrationFormComponent, JsonPipe],
  template: `
    <h1>Register</h1>
    <app-registration-form (submitted)="onFormSubmit($event)"></app-registration-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: RegistrationForm | null = null;

  onFormSubmit(data: RegistrationForm) {
    this.submittedData = data;
    console.log('Registration data submitted:', data);
  }
}
```

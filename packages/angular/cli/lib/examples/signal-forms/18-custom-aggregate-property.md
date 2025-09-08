---
title: 'Advanced: Custom Aggregate Property'
summary: Demonstrates how to create and use a custom `AggregateProperty` to compute a new reactive state across a form, such as aggregating non-blocking warning messages.
keywords:
  - signal forms
  - advanced
  - custom property
  - AggregateProperty
  - reducedProperty
  - listProperty
  - aggregateProperty
  - schema
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to extend the signal forms library with custom, domain-specific reactive properties. It solves the problem of calculating and tracking form-wide state that goes beyond the built-in states like `valid`, `touched`, or `dirty`. This allows library authors and advanced users to build powerful, reusable abstractions.

## When to Use

Use this pattern when you need to compute a new piece of state that is derived from multiple fields in your form. A perfect use case is aggregating "warnings" – messages that you want to show to the user but that don't make the form invalid. Other examples could include calculating a real-time "password strength" score or tracking the total cost in a shopping cart form.

## Key Concepts

- **`AggregateProperty`:** A special kind of property that can receive values from multiple sources within the schema and combine them into a single value.
- **`listProperty()`:** A factory function that creates an `AggregateProperty` which combines all provided values into an array.
- **`aggregateProperty()`:** A function used within a schema to contribute a value to an `AggregateProperty` on a specific field.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example defines a custom `warnings` property and uses it in a form to provide gentle feedback to the user.

### custom-properties.ts

This file defines our new, reusable `warnings` aggregate property.

```typescript
import { listProperty } from '@angular/forms/signals';

export interface FieldWarning {
  message: string;
}

// Creates a new aggregate property that will collect all warnings into an array.
export const warnings = listProperty<FieldWarning>();
```

### registration-form.component.ts

This file defines the component's logic, using the custom `warnings` property to check for a weak password.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, required, aggregateProperty, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { warnings, FieldWarning } from './custom-properties';

export interface RegistrationForm {
  username: string;
  password: string;
}

const registrationSchema = schema<RegistrationForm>((form) => {
  required(form.username);
  required(form.password);

  // Add a warning to the password field if it's too short.
  // This does NOT make the form invalid.
  aggregateProperty(form.password, warnings, ({ value }) => {
    if (value().length > 0 && value().length < 8) {
      return { message: 'Password is weak. Consider making it at least 8 characters.' };
    }
    return undefined;
  });
});

@Component({
  selector: 'app-registration-form',
  imports: [JsonPipe],
  templateUrl: './registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent {
  readonly submitted = output<RegistrationForm>();

  registrationModel = signal<RegistrationForm>({
    username: '',
    password: '',
  });

  registrationForm = form(this.registrationModel, registrationSchema);

  // We can now read the custom property from the field state.
  passwordWarnings = this.registrationForm.password().property(warnings);

  async handleSubmit() {
    await submit(this.registrationForm, async () => {
      this.submitted.emit(this.registrationForm().value());
    });
  }
}
```

### registration-form.component.html

This file provides the template, which reads the custom `warnings` property and displays the messages to the user.

```html
<form (submit)="handleSubmit(); $event.preventDefault()">
  <div>
    <label>Username:</label>
    <input type="text" [control]="registrationForm.username" />
  </div>

  <div>
    <label>Password:</label>
    <input type="password" [control]="registrationForm.password" />

    @if (passwordWarnings().length > 0) {
    <div class="warnings">
      @for (warning of passwordWarnings()) {
      <p>{{ warning.message }}</p>
      }
    </div>
    }
  </div>

  <button type="submit" [disabled]="!registrationForm().valid()">Register</button>
</form>
```

## Usage Notes

- The `warnings` property is created using `listProperty`, a built-in factory for creating array-based aggregate properties. You can create more complex properties with `reducedProperty`.
- The `aggregateProperty` function is used in the schema to add a warning to the `password` field's `warnings` property. It returns `undefined` when there is no warning to add.
- In the component, the aggregated warnings can be read from the field state using `myField().property(warnings)`. This returns a signal that will update whenever the calculated warnings change.
- Crucially, adding a warning does not affect the field's `valid` or `errors` state, allowing for a clear separation between validation errors and other kinds of feedback.

## How to Use This Example

The parent component interaction remains the same.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { RegistrationFormComponent } from './registration-form.component';
// ...
```

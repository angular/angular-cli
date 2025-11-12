---
title: Accessible and Styled Signal Forms
summary: Demonstrates how to build a production-ready signal form that is accessible to screen reader users and provides clear visual feedback using CSS and class bindings.
keywords:
  - signal forms
  - accessibility
  - a11y
  - styling
  - css
  - aria
  - class binding
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
  - 'accessibility'
experimental: true
---

## Purpose

The purpose of this pattern is to create forms that are usable by everyone, including people with disabilities, and provide a clear, intuitive user experience. It solves the problem of building forms that not only work correctly but are also compliant with accessibility standards (a11y) and provide visual cues for different states (e.g., invalid, touched).

## When to Use

Apply these patterns to all forms in a production application. Accessibility is a requirement for modern web development, and clear visual styling for form states is a fundamental aspect of good user experience design.

## Key Concepts

- **`[class.invalid]`:** A class binding that applies a CSS class to an element when a condition is true. Here, it's used to style an input based on its validity.
- **`touched` signal:** A signal on the `FieldState` that becomes `true` when the user has interacted with and then left the form control. This is useful for showing errors only after the user has had a chance to enter a value.
- **`aria-describedby`:** An accessibility attribute that links a form control to the element that describes it, such as an error message. This allows screen readers to announce the error when the user focuses on the invalid input.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component with dedicated files for its template and styles.

### registration-form.component.ts

This file defines the component's logic, focusing on the form's state and validation.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, required, email, minLength, submit } from '@angular/forms/signals';

export interface RegistrationData {
  name: string;
  email: string;
}

const registrationSchema = schema<RegistrationData>((form) => {
  required(form.name);
  minLength(form.name, 2);
  required(form.email);
  email(form.email);
});

@Component({
  selector: 'app-registration-form',
  templateUrl: './registration-form.component.html',
  styleUrl: './registration-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent {
  readonly submitted = output<RegistrationData>();

  registrationModel = signal<RegistrationData>({ name: '', email: '' });
  registrationForm = form(this.registrationModel, registrationSchema);

  async handleSubmit() {
    await submit(this.registrationForm, async () => {
      this.submitted.emit(this.registrationForm().value());
    });
  }
}
```

### registration-form.component.html

This file provides the template, enhanced with ARIA attributes and class bindings for stateful styling.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div class="form-field">
    <label for="name-input">Name:</label>
    <input
      id="name-input"
      type="text"
      [control]="registrationForm.name"
      [class.invalid]="registrationForm.name().invalid() && registrationForm.name().touched()"
      [attr.aria-invalid]="registrationForm.name().invalid()"
      [attr.aria-errormessage]="
        registrationForm.name().invalid() && registrationForm.name().touched() ? 'name-errors' : null
      "
    />

    @if (registrationForm.name().invalid() && registrationForm.name().touched()) {
    <div id="name-errors" class="errors">
      @for (error of registrationForm.name().errors()) { @if (error.required) {
      <p>Name is required.</p>
      } @if (error.minLength) {
      <p>Name must be at least 2 characters.</p>
      } }
    </div>
    }
  </div>

  <div class="form-field">
    <label for="email-input">Email:</label>
    <input
      id="email-input"
      type="email"
      [control]="registrationForm.email"
      [class.invalid]="registrationForm.email().invalid() && registrationForm.email().touched()"
      [attr.aria-invalid]="registrationForm.email().invalid()"
      [attr.aria-errormessage]="
        registrationForm.email().invalid() && registrationForm.email().touched()
          ? 'email-errors'
          : null
      "
    />

    @if (registrationForm.email().invalid() && registrationForm.email().touched()) {
    <div id="email-errors" class="errors">
      @for (error of registrationForm.email().errors()) { @if (error.required) {
      <p>Email is required.</p>
      } @if (error.email) {
      <p>Please enter a valid email.</p>
      } }
    </div>
    }
  </div>

  <button type="submit">Register</button>
</form>
```

### registration-form.component.css

This file contains the CSS rules that provide visual feedback for different form states, such as when a field is invalid.

```css
.form-field {
  margin-bottom: 1rem;
}

input.invalid {
  border-color: red;
  background-color: #fffafa;
}

.errors {
  color: red;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
```

## Usage Notes

- **Error Visibility:** Errors are only shown when a field is both `invalid` and `touched` (`@if (field().invalid() && field().touched())`). This provides a better user experience by not showing errors before the user has finished typing.
- **Styling:** The `[class.invalid]` binding adds a red border to the input only when it's invalid and has been touched, providing clear visual feedback.
- **Accessibility:** The `id` of the error message container is linked to the input via `aria-describedby`. This tells screen readers to announce the specific error message when the user focuses on the invalid input.

## How to Use This Example

This example demonstrates how to structure the HTML and CSS for an accessible and well-styled form. The parent component interaction remains the same.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { RegistrationFormComponent } from './registration-form.component';
// ...
```

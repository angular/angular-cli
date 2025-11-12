---
title: Signal Form with Dynamic Arrays
summary: Manages a dynamic array of fields in a signal form by applying a common validation schema to each element with `applyEach`.
keywords:
  - signal forms
  - form
  - control
  - dynamic arrays
  - applyEach
  - schema
  - submit
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to manage forms where a collection of fields can grow or shrink based on user interaction. It solves the problem of building UIs for editing lists of data (like multiple addresses or survey questions) where the exact number of items is not known in advance.

## When to Use

Use this pattern when you have a form where the user can add or remove multiple instances of a particular field group. This is the modern, signal-based equivalent of using a `FormArray` in `ReactiveFormsModule`, but with stronger type safety and a more declarative API.

## Key Concepts

- **`applyEach()`:** A function used within a schema to apply a sub-schema to each element of an array field.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component that defines and manages a survey form with a dynamic list of questions.

### survey-form.component.ts

This file defines the component's logic, including methods to dynamically add and remove questions from the form model.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, applyEach, validate, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface QuestionData {
  text: string;
  required: boolean;
}

export interface SurveyData {
  title: string;
  questions: QuestionData[];
}

const questionSchema = schema<QuestionData>((question) => {
  validate(question.text, ({ value }) => (value() === '' ? { required: true } : null));
});

const surveySchema = schema<SurveyData>((survey) => {
  validate(survey.title, ({ value }) => (value() === '' ? { required: true } : null));
  applyEach(survey.questions, questionSchema);
});

@Component({
  selector: 'app-survey-form',
  imports: [JsonPipe],
  templateUrl: './survey-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyFormComponent {
  readonly submitted = output<SurveyData>();

  surveyModel = signal<SurveyData>({
    title: '',
    questions: [{ text: '', required: false }],
  });

  surveyForm = form(this.surveyModel, surveySchema);

  addQuestion() {
    this.surveyModel.update((survey) => {
      survey.questions.push({ text: '', required: false });
      return { ...survey };
    });
  }

  removeQuestion(index: number) {
    this.surveyModel.update((survey) => {
      survey.questions.splice(index, 1);
      return { ...survey };
    });
  }

  async handleSubmit() {
    await submit(this.surveyForm, async () => {
      this.submitted.emit(this.surveyForm().value());
    });
  }
}
```

### survey-form.component.html

This file provides the template for the form, using an `@for` block to render the fields for each question in the array.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      Survey Title:
      <input type="text" [control]="surveyForm.title" />
    </label>
    @if (surveyForm.title().errors().length > 0) {
    <div class="errors">
      <p>Title is required.</p>
    </div>
    }
  </div>

  <h3>Questions</h3>
  @for (question of surveyForm.questions; track question; let i = $index) {
  <div>
    <label>
      Question Text:
      <input type="text" [control]="question.text" />
    </label>
    @if (question.text().errors().length > 0) {
    <div class="errors">
      <p>Question text is required.</p>
    </div>
    }
    <button type="button" (click)="removeQuestion(i)">Remove</button>
  </div>
  }

  <button type="button" (click)="addQuestion()">Add Question</button>
  <button type="submit">Submit Survey</button>
</form>
```

## Usage Notes

- The "Remove" and "Add" buttons have `type="button"` to prevent them from submitting the form.
- The "Submit" button is disabled based on the form's overall `valid` signal.

## How to Use This Example

The parent component listens for the `(submitted)` event and receives the strongly-typed form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { SurveyFormComponent, SurveyData } from './survey-form.component';

@Component({
  selector: 'app-root',
  imports: [SurveyFormComponent, JsonPipe],
  template: `
    <h1>Create Survey</h1>
    <app-survey-form (submitted)="onFormSubmit($event)"></app-survey-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: SurveyData | null = null;

  onFormSubmit(data: SurveyData) {
    this.submittedData = data;
    console.log('Survey data submitted:', data);
  }
}
```

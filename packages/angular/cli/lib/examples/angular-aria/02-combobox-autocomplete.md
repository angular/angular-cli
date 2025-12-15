---
title: Combobox with Autocomplete
summary: Demonstrates how to create an accessible combobox with autocomplete functionality using @angular/aria directives.
keywords:
  - Combobox
  - Autocomplete
  - Listbox
  - Option
  - ngCombobox
  - ngComboboxInput
  - ngListbox
  - ngOption
required_packages:
  - '@angular/aria/combobox'
  - '@angular/cdk/overlay'
  - '@angular/aria/listbox'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Forms'
  - 'Aria'
experimental: true
---

## Purpose

The combobox with autocomplete assists with scrolling fatigue by allowing users to filter large selections instantly through text input. It utilizes `@angular/aria/combobox` and also `@angular/aria/listbox` to provide the necessary logic and accessibility features for a combobox with autocomplete. Ultimately, it transforms overwhelming lists into a fast, searchable interface that minimizes input errors.

## When to Use

Use the Angular Aria combobox directives to implement a text input that provides a list of suggested, filterable options—the common autocomplete pattern for search fields and typeaheads. This pattern is ideal when the option list is long (over 20 items), users know what they are looking for, and speed is a priority, as typing is faster than scrolling. Conversely, avoid using it for short lists (under 10 options) or when users need to browse unfamiliar options, where a standard dropdown or list provides better visibility.

## Key Concepts

- **Combobox**: The main directive that acts as a container for the entire combobox widget, coordinating the interactions between the input and the listbox.
- **ComboboxInput**: directive connects an input element to the combobox.
- **ComboboxPopupContainer**: directive wraps the popup content and manages its display.
- **Listbox**: directive wraps the popup content and manages its display.
- **Option**: directive marks an item within a listbox.
- **OverlayModule**: A directive from the Angular CDK used to display the listbox of options next to the combobox input.

## Example Files

This example demonstrates a combobox that filters a list of fruits based on user input.

### combobox-autocomplete-example.ts

This file defines the combobox component, imports the necessary `@angular/aria/combobox` directives, and contains the logic for filtering the list of options.

```typescript
import {
  afterRenderEffect,
  signal,
  Component,
  computed,
  viewChild,
  viewChildren,
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { Combobox, ComboboxInput, ComboboxPopupContainer } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'combobox-autocomplete-example',
  templateUrl: 'combobox-autocomplete-example.html',
  styleUrls: ['combobox-autocomplete-example.css'],
  imports: [
    Combobox,
    ComboboxInput,
    ComboboxPopupContainer,
    Listbox,
    Option,
    OverlayModule,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxAutocompleteExample {
  options = viewChildren<Option<string>>(Option);
  combobox = viewChild<Combobox<string>>(Combobox);
  query = signal('');

  fruits = computed(() =>
    Fruits.filter((fruit) => fruit.toLowerCase().startsWith(this.query().toLowerCase())),
  );

  constructor() {
    // Scrolls to the active item when the active option changes.
    afterRenderEffect(() => {
      if (this.combobox()?.expanded()) {
        const option = this.options().find((opt) => opt.active());
        option?.element.scrollIntoView({ block: 'nearest' });
      }
    });
  }
}
const Fruits = [
  'Apple',
  'Avocado',
  'Banana',
  'Blueberry',
  'Cantaloupe',
  'Cherry',
  'Grapefruit',
  'Kiwi',
  'Lemon',
  'Mango',
  'Orange',
  'Peach',
  'Pear',
  'Pineapple',
  'Plum',
  'Strawberry',
  'Watermelon',
];
```

### combobox-autocomplete-example.html

This template structures the combobox, connecting the input field to the list of options and handling the dynamic filtering.

```html
<div ngCombobox filterMode="manual">
  <div #origin class="manual">
    <span class="search-icon material-symbols-outlined" translate="no">search</span>
    <input
      aria-label="Label dropdown"
      placeholder="Select a fruit"
      [(ngModel)]="query"
      ngComboboxInput
    />
  </div>
  <ng-template ngComboboxPopupContainer>
    <ng-template
      [cdkConnectedOverlay]="{origin, usePopover: 'inline', matchWidth: true}"
      [cdkConnectedOverlayOpen]="true"
    >
      <div class="combobox-popup">
        @if (fruits().length === 0) {
        <div class="no-results">No results found</div>
        }
        <div ngListbox>
          @for (fruit of fruits(); track fruit) {
          <div ngOption [value]="fruit" [label]="fruit">
            <span class="option-label">{{fruit}}</span>
            <span class="check-icon material-symbols-outlined" translate="no">check</span>
          </div>
          }
        </div>
      </div>
    </ng-template>
  </ng-template>
</div>
```

### combobox-autocomplete-example.css

This file provides basic styling for the combobox, including positioning the listbox and highlighting active options.

```css
@import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined');

.manual {
  display: flex;
  position: relative;
  align-items: center;
  width: fit-content;
}

[ngCombobox]:has([aria-expanded='false']) .combobox-popup {
  display: none;
}

.combobox-popup {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.material-symbols-outlined {
  pointer-events: none;
}
.search-icon {
  left: 0.75rem;
  position: absolute;
}

[ngComboboxInput] {
  width: 13rem;
  border-radius: 0.25rem;
  padding: 0.75rem 0.5rem 0.75rem 2.5rem;
}

[ngListbox] {
  height: 100%;
  display: flex;
  overflow: auto;
  max-height: 200px;
  flex-direction: column;
}

[ngOption] {
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 0 1rem;
  margin: 1px;
  gap: 2px;
  min-height: 2.25rem;
  border-radius: 0.5rem;
}

[ngOption][data-active='true'],
[ngOption]:hover {
  background: #eaeaea;
}

[ngOption][data-active='true'] {
  outline-offset: -2px;
  outline: 2px solid grey;
}

[ngOption][aria-selected='true'] {
  background: #e8f0fe;
}

[ngOption]:not([aria-selected='true']) .check-icon {
  display: none;
}

.option-label {
  flex: 1;
}

.no-results {
  padding: 1rem;
}
```

## Usage Notes

- The `[(ngModel)]` binding on the input directly updates the `query` signal, enabling two-way data binding with `FormsModule`.
- The `cdkConnectedOverlay` directive used to position the `ngListbox` directly beneath the `ngComboboxInput`. This is integrated to use the Popover API.
- This uses manual selection keeps the typed text unchanged while users navigate the suggestion list and selection occurs explicityly by enter or click. This can be changed to auto-select or highlight.

---
title: Select
summary: Demonstrates how to create an accessible select-only combobox using @angular/aria directives, where the user must choose from a predefined list of options.
keywords:
  - Select
  - Readonly
  - Combobox
  - Listbox
  - Option
  - ngCombobox
  - ngComboboxInput
  - ngListbox
  - ngOption
required_packages:
  - '@angular/aria/combobox'
  - '@angular/aria/listbox'
  - '@angular/cdk/overlay'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Forms'
  - 'Aria'
experimental: true
---

## Purpose

The single-selection dropdown pattern restricts user input to a predefined set of options, ensuring that only valid data is selected. It utilizes `@angular/aria/combobox` and also `@angular/aria/listbox` to provide the necessary logic and accessibility features for a single-select dropdown.

## When to Use

The Select pattern works best when users need to choose a single value from a familiar, fixed set of fewer than 20 options. It is ideal for standard form fields—such as category, state, or status selection—where users can quickly scan clear, distinct labels without the need for filtering or search. However, this pattern should be avoided if the list exceeds 20 items or requires text input whereas the autocomplete pattern provides the necessary filtering. Additionally, use the Multiselect pattern when multiple choices are required, or Radio Buttons for very small sets (2–3 options) to ensure immediate visibility of all choices.

## Key Concepts

- **Combobox**: The main directive that acts as a container for the entire combobox widget, coordinating the interactions between the input and the listbox.
- **ComboboxInput**: directive connects an input element to the combobox.
- **ComboboxPopupContainer**: directive wraps the popup content and manages its display.
- **Listbox**: directive wraps the popup content and manages its display.
- **Option**: directive marks an item within a listbox.
- **OverlayModule**: A directive from the Angular CDK used to display the listbox of options next to the combobox input.

## Example Files

This example demonstrates a select-only combobox for selecting a few items for a status.

### select-only-example.ts

This file defines the basic select component with selectable items of different task statuses.

```typescript
import { Combobox, ComboboxInput, ComboboxPopupContainer } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  viewChild,
  viewChildren,
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'select-only-example',
  templateUrl: 'select-only-example.html',
  styleUrls: ['select-only-example.css'],
  imports: [Combobox, ComboboxInput, ComboboxPopupContainer, Listbox, Option, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectExample {
  listbox = viewChild<Listbox<string>>(Listbox);
  options = viewChildren<Option<string>>(Option);
  combobox = viewChild<Combobox<string>>(Combobox);

  items = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done', 'Obsolete'];

  displayValue = computed(() => {
    const values = this.listbox()?.values() || [];
    return values.length ? values[0] : 'Select an Option';
  });

  constructor() {
    afterRenderEffect(() => {
      const option = this.options().find((opt) => opt.active());
      option?.element.scrollIntoView({ block: 'nearest' });
    });
  }
}
```

### select-only-example.html

This template structures a `readonly` Combobox that functions as a selectable interface, revealing a list of items upon interaction. The readonly attribute on ngCombobox prevents text input while preserving keyboard navigation. It leverages the CDK Popup and Popover APIs to manage the overlay, ensuring robust accessibility and correct positioning.

```html
<div ngCombobox [readonly]="true">
  <div #origin class="select">
    <div class="select-value">
      <span class="select-label">{{ displayValue() }}</span>
    </div>
    <input aria-label="Select an option" ngComboboxInput />
    <span class="arrow material-symbols-outlined">arrow_drop_down</span>
  </div>

  <ng-template
    [cdkConnectedOverlay]="{origin, usePopover: 'inline', matchWidth: true}"
    [cdkConnectedOverlayOpen]="true"
  >
    <ng-template ngComboboxPopupContainer>
      <div class="select-popup">
        <div ngListbox>
          @for (item of items; track item) {
          <div ngOption [value]="item" [label]="item">
            <span class="option-text">{{item}}</span>
            <span aria-hidden="true" class="option-check material-symbols-outlined">check</span>
          </div>
          }
        </div>
      </div>
    </ng-template>
  </ng-template>
</div>
```

### select-only-example.css

This file provides basic styling for the `select-only` combobox, listbox, and options.

```css
.select {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid black;
  border-radius: 4px;
  width: fit-content;
}

.select:focus-within {
  outline-offset: -2px;
  outline: 2px solid grey;
}

.arrow,
.select-value {
  position: absolute;
  pointer-events: none;
}

.select-value {
  display: flex;
  gap: 1rem;
  left: 1rem;
  width: calc(100% - 4rem);
}

.arrow {
  font-size: 1.25rem;
  opacity: 0.875;
}

.arrow {
  right: 1rem;
  transition: transform 0.2s ease-in-out;
}

[ngComboboxInput] {
  cursor: pointer;
  padding: 0.7rem 3rem;
  opacity: 0;
}

[ngComboboxInput][aria-expanded='true'] + .arrow {
  transform: rotate(180deg);
}

[ngCombobox]:has([aria-expanded='false']) .select-popup {
  display: none;
}

.select-popup {
  width: 100%;
  margin-top: 2px;
  padding: 0.1rem;
  max-height: 11rem;
  border-radius: 4px;
  background-color: #fff;
  border: 1px solid black;
}

[ngListbox] {
  gap: 2px;
  width: 100%;
  height: 100%;
  display: flex;
  overflow: auto;
  flex-direction: column;
}

[ngOption] {
  display: flex;
  cursor: pointer;
  align-items: center;
  margin: 1px;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-radius: 4px;
}

[ngOption][aria-disabled='true'] {
  cursor: default;
  opacity: 0.5;
  background-color: grey;
}

[ngOption]:hover {
  background: #eaeaea;
}

[ngOption][data-active='true'] {
  outline-offset: -1px;
  outline: 1px solid grey;
}

[ngOption][aria-selected='true'] {
  background: #e8f0fe;
}

[ngOption]:not([aria-selected='true']) .option-check {
  display: none;
}

.option-text {
  flex: 1;
}

.option-check {
  font-size: 1rem;
}
```

## Usage Notes

- The `readonly` attribute on `ngCombobox` is necessary to prevent text input while also keeping the keyboard navigation. Similar to native `select` element.
- Add the `disabled` attribute to `ngCombobox` to disable the entire select.
- The select pattern uses `ngListbox` for the list and `ngOption` for each selectable option.

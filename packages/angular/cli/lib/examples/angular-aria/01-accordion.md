---
title: Accordion
summary: Demonstrates how to create an accessible accordion component using @angular/aria directives.
keywords:
  - Accordion
  - AccordionGroup
  - AccordionTrigger
  - AccordionPanel
  - AccordionContent
  - ngAccordionGroup
  - ngAccordionTrigger
  - ngAccordionPanel
  - ngAccordionContent
required_packages:
  - '@angular/aria/accordion'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `@angular/aria/accordion` accordion directives provide the foundational logic and accessibility features for creating accordion-style UI elements. Accordion are used to organize related content into expandable and collapsible sections with a trigger button and a content panel.

## When to Use

Use the Angular Aria accordion directives when you need to display a list of headers that can show or hide associated content panels. This pattern is ideal for FAQs, long-form content segmentation, or progressively disclosing information to reduce page scrolling. Avoid using accordions for general navigation menus, tabbed interfaces, or whenever multiple sections of content must be simultaneously visible.

## Key Concepts

- **AccordionGroup**: A directive that acts as the container for a set of accordion items. It manages the overall state and interactions of the accordion, such as keyboard navigation and expansion mode.
- **AccordionTrigger**: A directive that represents the trigger button for an accordion item. It controls the expansion state of an associated `ngAccordionPanel`.
- **AccordionPanel**: A directive that represents the content panel of an accordion item. It is controlled by an associated `ngAccordionTrigger`.
- **AccordionContent**: A structural directive that marks the `ng-template` to be used as the content for an `ngAccordionPanel`. This content can be lazily loaded.

## Example Files

This example demonstrates a basic, accessible accordion with two items that allows only one panel to be open at a time.

### accordion-example.ts

This file defines the accordion component, imports the necessary `@angular/aria/accordion` directives, and provides the data for the accordion items.

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AccordionGroup,
  AccordionTrigger,
  AccordionPanel,
  AccordionContent,
} from '@angular/aria/accordion';

@Component({
  selector: 'accordion-example',
  templateUrl: 'accordion-example.html',
  styleUrls: ['accordion-example.css'],
  imports: [AccordionGroup, AccordionTrigger, AccordionPanel, AccordionContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionExample {}
```

### accordion-example.html

This template structures the accordion using the `ngAccordionGroup`, `ngAccordionTrigger`, `ngAccordionPanel`, and `ngAccordionContent` directives, binding the necessary ARIA attributes for accessibility.

```html
<h1>Accordion Examples</h1>

<div ngAccordionGroup [multiExpandable]="false">
  <h3>
    <span ngAccordionTrigger panelId="item-1" #trigger1="ngAccordionTrigger">
      Accordion Heading 1
      <span
        aria-hidden="true"
        class="expand-icon"
        [class.expand-icon__expanded]="trigger1.expanded()"
      ></span>
    </span>
  </h3>
  <div ngAccordionPanel panelId="item-1">
    <ng-template ngAccordionContent>
      <p>Accordion Content Here</p>
    </ng-template>
  </div>

  <h3>
    <span ngAccordionTrigger panelId="item-2" #trigger2="ngAccordionTrigger">
      Accordion Heading 2
      <span
        aria-hidden="true"
        class="expand-icon"
        [class.expand-icon__expanded]="trigger2.expanded()"
      ></span>
    </span>
  </h3>
  <div ngAccordionPanel panelId="item-2">
    <ng-template ngAccordionContent>
      <p>More Accordion Content Here</p>
    </ng-template>
  </div>
</div>
```

### accordion-example.css

This file provides basic styling to make the component visually function like an accordion, including focus indicators, icons, and transitions. Note that there are no disabled styles.

```css
@import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined');

[ngAccordionGroup] {
  width: 300px;
}

[ngAccordionTrigger] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: 12px 16px;
}

h3 {
  margin: 0;
  position: relative;
}

h3:focus-within::before,
h3:hover::before {
  content: '';
  position: absolute;
  height: 100%;
  width: 2px;
  background-color: blue;
  top: 0;
  left: 0;
}

h3:not(:first-of-type) {
  border-block-start: 1px solid lightgrey;
}

p {
  padding: 1rem 2rem;
}

[ngAccordionTrigger] svg {
  width: 24px;
  height: 24px;
  transition: transform 0.2s ease-in-out;
  transform: rotate(90deg);
  pointer-events: none;
}

[ngAccordionTrigger][aria-expanded='true'] svg {
  transform: rotate(-90deg);
}

.expand-icon {
  position: relative;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin-left: 1rem;
}

.expand-icon::before,
.expand-icon::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  top: 50%;
  background-color: black;
  transition: 0.3s ease-out;
}

.expand-icon::after {
  transform: rotate(90deg);
}
.expand-icon__expanded::before {
  transform: translateY(-50%) rotate(-90deg);
  opacity: 0;
}
.expand-icon__expanded::after {
  transform: translateY(-50%) rotate(0);
}
```

## Usage Notes

- The core link between the header and the content is established by ensuring the `[ngAccordionTrigger]` panelId and the `[ngAccordionPanel]` panelId are identical (e.g., item-id).
- The `[ngAccordionContent]` directive is applied to an `ng-template` to enable deferred rendering for performance optimization.
- Disable triggers using the `disabled` input.

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component, Input } from '@angular/core';
import { CurrentNode, NavigationNode } from 'app/navigation/navigation.service';

@Component({
  selector: 'aio-nav-menu',
  template: `
  <aio-nav-item *ngFor="let node of filteredNodes" [node]="node" [selectedNodes]="currentNode?.nodes" [isWide]="isWide">
  </aio-nav-item>`
})
export class NavMenuComponent {
  @Input() currentNode: CurrentNode;
  @Input() isWide = false;
  @Input() nodes: NavigationNode[];
  get filteredNodes() { return this.nodes ? this.nodes.filter(n => !n.hidden) : []; }
}

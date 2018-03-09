import { Injectable } from '@angular/core';<% if (providedIn) { %>
import { <%= providedIn %> } from '<%= providedInPath %>';<% } %>

@Injectable({
  providedIn: <%= providedIn || "'root'" %>,
})
export class <%= classify(name) %>Service {

  constructor() { }
}

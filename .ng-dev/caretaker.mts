import { CaretakerConfig } from '@angular/ng-dev';

/** The configuration for `ng-dev caretaker` commands. */
export const caretaker: CaretakerConfig = {
  githubQueries: [
    {
      name: 'Merge Queue',
      query: `is:pr is:open status:success label:"action: merge"`,
    },
    {
      name: 'Merge Assistance Queue',
      query: `is:pr is:open label:"action: merge-assistance"`,
    },
  ],
  caretakerGroup: 'angular-cli-caretaker',
};

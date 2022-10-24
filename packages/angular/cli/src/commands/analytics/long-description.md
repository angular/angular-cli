You can help the Angular Team to prioritize features and improvements by permitting the Angular team to send command-line command usage statistics to Google.
The Angular Team does not collect usage statistics unless you explicitly opt in. When installing the Angular CLI you are prompted to allow global collection of usage statistics.
If you say no or skip the prompt, no data is collected.

### What is collected?

Usage analytics include the commands and selected flags for each execution.
Usage analytics may include the following information:

- Your operating system \(macOS, Linux distribution, Windows\) and its version.
- Package manager name and version \(local version only\).
- Node.js version \(local version only\).
- Angular CLI version \(local version only\).
- Command name that was run.
- Workspace information, the number of application and library projects.
- For schematics commands \(add, generate and new\), the schematic collection and name and a list of selected flags.
- For build commands \(build, serve\), the builder name, the number and size of bundles \(initial and lazy\), compilation units, the time it took to build and rebuild, and basic Angular-specific API usage.

Only Angular owned and developed schematics and builders are reported.
Third-party schematics and builders do not send data to the Angular Team.

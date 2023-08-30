# Make Apps SDK plugin for Visual Studio Code

## Features

- Source code editor with syntax highlighter and hints
- Icon editor
- Version control
- Apps control (CRUD modules, RPCs, connections, ...)
- Documentation editor
- Faster and more comfortable than the web interface
- Everything in one place
- ... and much more

**Read more in [our documentation](https://docs.integromat.com/apps/apps-sdk).**

---

## Upcoming feature: Local development (pre-alpha)

### Features Status

#### Implemented (but use for testing purposes only!)

- Clone SDK app to local workspace
- Deploy any code file up to Make (+bulk deploy)
- Rewrite the local file by the newer version from Make (pull)
- Compare local code file with Make
- Ability to have multiple origins of a single local app to be able to use for staging
- ApiKey store as local file(s)
- Pull new components from Make
- Compatible with GIT versioning

#### Not implemented yet

- "Deploy all" by clicking on `makecomapp.json`.
- Handle multiple apiKey files in the same workspace.
- Smart code highlight and JSON validation.
- Handle with HTTP 428 API rate limit reach.
- Local create webhooks, modules, RPCs, and functions.
- Pull all changes from Make
- IMLJSON suggestions (e.g. `parameters`, `connection` object properties)
- Icon file

#### Fixed/resolved

- Cloning issue of components with the same ID (but different character case only)
  - For example: two modules: `myModule`, `mymodule`
  - File extension `.imljson` change to `.iml.json`.
- All longer actions display the progress/busy notification.

**IMPORTANT NOTE: Local file structure and all these features for local development
                are under development and don't have to be stable yet.**

### How to use SDK app local development

The idea is that a developer can `clone` a whole SDK app from Make to local files. Files are `pulled` to the workspace currently opened in VS Code. From this time all local files are "disconnected" from Make until a developer `deploys` them back to Make. Therefore a developer can work on changes as long as he needs without touching on the SDK app running in Make. When all necessary changes are made locally a developer can `deploy` changes back to Make. The whole SDK app can be `deployed` or any `component` can be deployed anytime separately. There is also a way to `pull` changes made in Make and update the local files in case somebody is touching to SDK app `codes` directly on Make UI or by VS Code Extension online editing.

### Terms used in local development feature

- `component` - One section of an app. Each component is one of the following type:
                `module`, `connection`, `rpc`, `custom function`, `webhook`.
- `code` - Each file (mostly JSON) is named `code` and it is the part `component`
           or it belongs to the app itself directly (like `Base`, `Common` or `Readme`).
- `clone` - The process, which clones a SDK app from Make into a newly created local directory in your opened workspace.
- `pull` - The process, which updates or inserts a local component (or it's code) loaded from a remote origin (Make).
- `deploy` - The process, which pushes/uploads a local component or code to remote origin (Make).
- `remote`, `origin` - Make.com or similar public cloud Make instance or private Make instance.

### How to clone an app to local files

1. Open the workspace (local directory), where an SDK app should be placed.

   *Note: Monorepo style is supported. It means multiple SDK apps can be placed in the same workspace.*

2. In VS Code's Activity Bar click on tab `Make apps` to see all your already existing SDK apps.

   *Note: Expected the `Make Apps SDK` VS Code extension to be installed and the environment with ApiKey is already configured.*

3. Use the right mouse to click on any SDK app and select the `Clone to local workspace` context menu item.

4. The process asks you to destination directory.  The default is the `src`.

   *Note: If you intend to have multiple apps in a single workspace, each app must be cloned into a different subdirectory.*

5. When the `clone` process is finished VS Code switches the view to File Explorer, where newly pulled files are placed and the app `README` file will be opened.

   *After this step the local development is ready to use! 👍*

### Deploy local changes to Make

Any part of the SDK app (including all changes) can be deployed back to Make. For this action do a right mouse click to any code file, component directory, whole `src` directory or `makecomapp.json` file. Select the menu item `Deploy to Make` to start updating the SDK app in Make by local code files.

If the component does not exist in Make yet, then the developer sees the info message with confirmation to create a new component in Make.

### Add new components into local files

To add a new SDK app component into local files there are two ways: assisted or manual.

#### Assisted component adding

Right-click to `makecomapps.json` and select `Create "[componentType]" component`. In this way, you can add new `modules`, `connections`, `custom functions`, `rpcs`, and `webhooks`.

The alternative way is to right-click on an appropriate directory with the list of components. Example: Directory `components` has context menu item `Create "connection" component`.

This action creates appropriate code files and defines the new component in `makecomapp.json`.

#### Manual component adding

You can create new components manually by the same steps as the assisted component adding.

1. Create the new component directory in the same structure as another existing one. The directory structure is `[src]/[componentType]/[componentName]`. Example: `src/modules/get-items`.

2. Create the required code files of the component. Note: Each type of component requires another set of code files. In this step, the easiest way is to copy/paste files from another existing similar component.

3. Add component details and the references to files created in step 2 into the `makecomapp.json` file placed in the component root directory. Again, the easiest way is to copy/paste the structure from another similar existing component.

### Storing ApiKey during local development

IMPORTANT: In the case of using app local development, the API key is stored in `[workspaceRoot]/.secrets/apikey1` file. When multiple origins or multiple apps are placed in a single workspace there will be multiple files.

Path `.secrets` is automatically added into `.gitignore` to avoid accidentally committing into a GIT repository.

### Multiple remote origins

Each locally developer SDK app is cloned from its remote origin. Origin (Make API URI with the API key) is defined in `makecomapp.json` in the section `origins`. By default, each app has one origin. But this can be extended with an unlimited count of origins by a simple edit of this section `origins`.

From the time you define the second origin (or more), you will be asked by VS Code dialog to choose the origin from the list on each interaction with a remote app in Make (deploy, pull, ...).

The purpose of this feature is to cover the case, where developers have also another SDK app in Make used for the development or testing stage.

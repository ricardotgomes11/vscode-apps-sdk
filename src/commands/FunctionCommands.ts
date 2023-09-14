import { IML } from '@integromat/iml';
import ivm from 'isolated-vm';
import * as vscode from 'vscode';
import * as Core from '../Core';
import * as Validator from '../Validator';
import { catchError } from '../error-handling';
import { Environment } from '../types/environment.types';
import AppsProvider from '../providers/AppsProvider';

export class FunctionCommands {
	static async register(
		appsProvider: AppsProvider, _authorization: string, _environment: Environment, _timezone: string
	) {

		const outputChannel = vscode.window.createOutputChannel('IML tests')

		/**
		 * New function
		 */
		vscode.commands.registerCommand('apps-sdk.function.new', catchError('Function creation', async (context) => {

			// If called out of context -> die
			if (!Core.contextGuard(context)) { return }

			// Get the source app
			const app = context.parent

			// Prompt for the function name
			const name = await vscode.window.showInputBox({
				prompt: 'Enter function name',
				ignoreFocusOut: false,
				validateInput: Validator.functionName
			})

			// If not filled -> die
			if (!Core.isFilled('name', 'function', name)) { return }

			// Add the new entity. Refresh the tree or show the error
			await Core.addEntity(_authorization, { name: name }, `${_environment.baseUrl}/${Core.pathDeterminer(_environment.version, '__sdk')}${Core.pathDeterminer(_environment.version, 'app')}/${app.name}/${app.version}/${Core.pathDeterminer(_environment.version, 'function')}`)
			appsProvider.refresh()
		}));

		/**
		 * Run function test
		 */
		vscode.commands.registerCommand('apps-sdk.function.test', async function (context) {

			let urn: string;
			let functionName: string;

			// If called out of context -> gather the required information
			if (context === undefined || context === null) {
				// If a window is open
				if (!vscode.window.activeTextEditor) {
					vscode.window.showErrorMessage('Active text editor not found.')
					return
				}
				// If an apps file is open
				if (!vscode.window.activeTextEditor.document.uri.fsPath.split('apps-sdk')[1]) {
					vscode.window.showErrorMessage("Opened file doesn't belong to Apps SDK.")
					return
				}
				// Parse the path
				const crumbs = vscode.window.activeTextEditor.document.uri.fsPath.split('apps-sdk')[1].split('/').reverse()
				// If crumbs were parsed
				if (!crumbs) {
					vscode.window.showErrorMessage('The path was not parsed successfully.')
					return
				}
				// If the path hasn't 8 or 7 crumbs it's definitely not a function
				if (crumbs.length !== 8 && crumbs.length !== 7) {
					vscode.window.showErrorMessage("The parsed path doesn't lead to function.")
					return
				}
				// If the path doesn't contain required crumbs
				if (!((crumbs[0] === 'test.js' || crumbs[0] === 'code.js') && (crumbs[2] === 'function' || crumbs[2] === 'functions') && (crumbs[5] === 'app' || crumbs[5] === 'apps'))) {
					vscode.window.showErrorMessage("The parsed path doesn't correspond to the function test schema.")
					return
				}
				// If all checks passed, set URN
				urn = `${_environment.baseUrl}/${Core.pathDeterminer(_environment.version, '__sdk')}${Core.pathDeterminer(_environment.version, 'app')}/${crumbs[4]}/${crumbs[3]}/${Core.pathDeterminer(_environment.version, 'function')}`
				functionName = `${crumbs[1]}`
			}

			// Else parse from context
			else {
				// Set correct URN (if called from function or core or test)
				urn = `${_environment.baseUrl}/${Core.pathDeterminer(_environment.version, '__sdk')}${Core.pathDeterminer(_environment.version, 'app')}/${Core.getApp(context).name}/${Core.getApp(context).version}/${Core.pathDeterminer(_environment.version, 'function')}`
				if (context.supertype === 'function') {
					functionName = `${context.name}`
				}
				else if (context.name === 'code' || context.name === 'test') {
					functionName = `${context.parent.name}`
				} else {
					throw new Error('Internal error: Unexpected state, cannot resolve the "functionName".');
				}
			}

			// Get current function code
			const code = await Core.rpGet(`${urn}/${functionName}/code`, _authorization)

			// Get current test code
			const test = await Core.rpGet(`${urn}/${functionName}/test`, _authorization)

			// Get users' functions
			let userFunctions: { name: string, code: string }[] = await Core.rpGet(`${urn}`, _authorization, { code: true, cols: ['name', 'code'] })
			if (_environment.version === 2) {
				userFunctions = (<any>userFunctions).appFunctions;
			}

			// Merge codes
			const codeToRun = `${code}\r\n\r\n/* === TEST CODE === */\r\n\r\n${test}`

			/**
			 *  Sandbox cookbook
			 *  - Assert for assertions
			 *  - IML for internal IML functions
			 *  - Users' IML functions
			 */
			let success = 0
			let fail = 0
			let total = 0
			const sandbox /* : VMOptions['sandbox'] */ = {
				assert: require('assert'),
				iml: {} as Record<string, (...args: any) => any>,
				it: (name: string, test: () => void) => {
					total++;
					outputChannel.append(`- ${name} ... `);
					try {
						test();
						outputChannel.appendLine('✔');
						success++;
					} catch (err) {
						outputChannel.appendLine(`✘ => ${err}`);
						fail++;
					}
				},
				environment: {
					timezone: _timezone,
				},
			};

			// Add build-in IML functions as global `iml.[functionName]`
			Object.keys(IML.FUNCTIONS).forEach((name) => {
				sandbox.iml[name] = IML.FUNCTIONS[name].value.bind({ timezone: sandbox.environment.timezone });
			});

			outputChannel.clear();
			outputChannel.appendLine(
				`======= STARTING IML TEST =======\r\nFunction: ${functionName}\r\n---------- IN PROGRESS ----------`,
			);

			// Prepare the isolated context
			const isolate = new ivm.Isolate({ memoryLimit: 32 /* MB */ });
			const ivmContext = isolate.createContextSync();
			const ivmJail = ivmContext.global;
			ivmJail.setSync('global', ivmJail.derefInto());
			ivmJail.setSync('assert', sandbox.assert);
			ivmJail.setSync('iml', sandbox.iml);
			ivmJail.setSync('it', sandbox.it);
			ivmJail.setSync('environment', sandbox.environment);

			// Make all other user functions available in the isolation,
			// because the tested function can call other functions anytime.
			const userFunctionsCode = userFunctions
				.map((userFunction) => {
					if (userFunction.name !== functionName) {
						return `function ${userFunction.name} (...arguments) { (${userFunction.code}).apply({timezone: environment.timezone}, arguments); }`;
					}
				})
				.join('\n\n');
			ivmContext.evalSync(userFunctionsCode, { timeout: 2000 });

			// Show output channel IML tests and try running the test code
			outputChannel.show();

			// Execute the test
			try {
				const script = isolate.compileScriptSync(codeToRun);
				await script.run(context);
				outputChannel.appendLine('----------- COMPLETED -----------');
				outputChannel.appendLine(`Total test blocks: ${total}`);
				outputChannel.appendLine(`Passed blocks: ${success}`);
				outputChannel.appendLine(`Failed blocks: ${fail}`);
				if (fail === 0) {
					outputChannel.appendLine('========== TEST PASSED ==========')
				}
				else {
					outputChannel.appendLine('========== TEST FAILED ==========')
				}
			}
			catch (err: any) {
				outputChannel.appendLine('========= CRITICAL FAIL =========')
				outputChannel.appendLine(err)
			}
		})
	}
}

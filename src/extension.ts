import * as vscode from 'vscode';
import {cfSignInDisposable,CfProblemsProvider} from "./program";

export function activate(context: vscode.ExtensionContext) {
	const dataProvider = new CfProblemsProvider();
	vscode.window.registerTreeDataProvider('codeforces', dataProvider);
	vscode.commands.registerCommand("cpsolver.refresh",() => dataProvider.refresh());
	context.subscriptions.push(
		cfSignInDisposable
	);
}


export function deactivate() {}

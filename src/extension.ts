import * as vscode from 'vscode';
import {cfSignInDisposable,CfProblemsProvider,} from "./program";

export function activate(context: vscode.ExtensionContext) {
	const dataProvider = new CfProblemsProvider(true,true,0);
	vscode.window.registerTreeDataProvider('codeforces', dataProvider);
	vscode.commands.registerCommand("cpsolver.refresh",() => dataProvider.refresh(0));
	context.subscriptions.push(
		cfSignInDisposable,

	);
}


export function deactivate() {}

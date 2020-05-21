import * as vscode from 'vscode';
import {cfSignInDisposable,problemBar} from "./program";

export function activate(context: vscode.ExtensionContext) {
	
	context.subscriptions.push(
		cfSignInDisposable,
		problemBar
	);
}


export function deactivate() {}

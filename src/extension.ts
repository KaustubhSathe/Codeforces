import * as vscode from 'vscode';
import {cfSignInFlow,problemBar} from "./program";

export function activate(context: vscode.ExtensionContext) {
	
	context.subscriptions.push(
		cfSignInFlow,
		problemBar
	);
}


export function deactivate() {}

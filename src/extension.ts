import * as vscode from 'vscode';
import {cfDisposable} from "./program";

export function activate(context: vscode.ExtensionContext) {
		
	context.subscriptions.push(cfDisposable);
}


export function deactivate() {}

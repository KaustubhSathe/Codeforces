import * as vscode from 'vscode';
import {cfSignInDisposable,CfProblemsProvider,} from "./program";

export function activate(context: vscode.ExtensionContext) {
	const dataProvider = new CfProblemsProvider();
	vscode.window.registerTreeDataProvider('codeforces', dataProvider);
	vscode.commands.registerCommand("cpsolver.refresh",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("cpsolver.sortByDifficulty",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("cpsolver.sortBySubmission",() => dataProvider.refresh(1));
	vscode.commands.registerCommand("cpsolver.displayProblem",async (problemId:string) => {await dataProvider.displaySelectedProblemInView(problemId);});
	context.subscriptions.push(
		cfSignInDisposable
	);
}


export function deactivate() {}

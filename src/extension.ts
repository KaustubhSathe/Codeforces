import * as vscode from 'vscode';
import { Puppet } from "./puppet";

export function activate(context: vscode.ExtensionContext) {
	vscode.window.registerTreeDataProvider('codeforces', dataProvider);
	vscode.commands.registerCommand("codeforces.refresh",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("codeforces.sortByDifficulty",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("codeforces.sortBySubmission",() => dataProvider.refresh(1));
	vscode.commands.registerCommand("codeforces.displayProblem",async (problemId:string) => {await dataProvider.displaySelectedProblemInView(problemId);});
	vscode.commands.registerCommand("codeforces.SignIn",async () => puppet.signIntoCfFlow());
}


export function deactivate() {}

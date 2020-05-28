import * as vscode from 'vscode';
import { Puppet } from "./puppet";
import {CodeforcesDataProvider} from "./tree-view-stuff";

export function activate(context: vscode.ExtensionContext) {
	const puppet = new Puppet();
	const dataProvider = new CodeforcesDataProvider(puppet);
	

    // And get the special URI to use with the webview
	vscode.window.registerTreeDataProvider('codeforces', dataProvider);
	vscode.commands.registerCommand("codeforces.SignIn",async () => puppet.signIntoCfFlow());
	vscode.commands.registerCommand("codeforces.refresh",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("codeforces.sortByDifficulty",() => dataProvider.refresh(0));
	vscode.commands.registerCommand("codeforces.sortBySubmission",() => dataProvider.refresh(1));
	vscode.commands.registerCommand("codeforces.displayProblem",async (problemId:string) => {await dataProvider.displaySelectedProblemInView(problemId);});
	
}


export function deactivate() {}

/*-----------------------------Imports-----------------------------*/
import {cf_user_name,cf_pass,sp_user_name,sp_pass,setCF,setSP} from "./userInfo";
import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import axios from "axios";
let browser:puppeteer.Browser|null = null,page:puppeteer.Page|null = null;
/*-----------------------------Puppeteer Stuff-----------------------------*/
const initPuppeteer = async () => {
    browser = await puppeteer.launch({headless:true});
    page = await browser.newPage();
}

/*-----------------------------Codeforces Sign In-----------------------------*/
const signInCF = async (username:string,password:string) : Promise<boolean> => {
    if(browser === null){
        await initPuppeteer();
    }
    browser = browser as puppeteer.Browser;
    page = page as puppeteer.Page;
    
    await page.goto("https://codeforces.com/enter?back=%2F");
    await page.type("#handleOrEmail",username);
    await page.type("#password",password);
    await Promise.all([
        page.waitForNavigation(),
        page.click("#enterForm > table > tbody > tr:nth-child(4) > td > div:nth-child(1) > input")
    ]);

    if(page.url() === "https://codeforces.com/enter?back=%2F"){
        return false;
    }
    
    return true;
}



export const cfSignInFlow = vscode.commands.registerCommand("cpsolver.cfSignIn",async () => {
    if(cf_user_name !== null){
        vscode.window.showInformationMessage("Already Signed in as "+cf_user_name+". If you want to change then please type ahead.");
    }
    while(true){
        let input: string|undefined = await vscode.window.showInputBox({placeHolder:"Please enter your codeforces username and password SPACE SEPERATED"});
        if(!verify(input)){
            if(input === undefined){break;}
            vscode.window.showErrorMessage("Please enter Username and Password SPACE SEPERATED.");
        }else{
            input = input as string;
            const [username,password] = input.split(" ");
            const ok:boolean = await signInCF(username,password);
            if(!ok){
                vscode.window.showErrorMessage("Wrong Username or Password entered! Please try again.");
                continue;
            }
            setCF(username,password);
            vscode.window.showInformationMessage("Succesfully signed in as : " + username);
            break;
        }
    }
})

/*-----------------------------Utils-----------------------------*/
const verify = (input : string|undefined): boolean => {
    const items = input?.split(" ");
    if(items === undefined||items.length !== 2){return false;}
    return true;
}


/*-----------------------------Tree-View-Stuff-----------------------------*/
class Problem extends vscode.TreeItem{
    constructor(
        public readonly label:string,
        private rating:Number|null,
        private userSubmissions:Number|null,
        private problemID:string,
        private tags:string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState 
    ){
        super(label,collapsibleState);
    }

    get tooltip(): string{
        if(this.rating === null) {return "";}
        return `${this.tags}`;
    }

    get description(): string{
        if(this.rating === null) {return "";}
        return `Difficulty: ${this.rating} | Solved Count: ${this.userSubmissions}`;
    }  
}



class CfProblemsProvider implements vscode.TreeDataProvider<Problem>{
    constructor(){}
    getTreeItem(element: Problem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;    
    }
    getChildren(element?: Problem | undefined): vscode.ProviderResult<Problem[]> {
        if(element){
            return Promise.resolve(this.getProblems(element.label));
        }else{
            return Promise.resolve([
                new Problem("2-sat",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("binary search",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("bitmasks",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("brute force",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("chinese remainder theorem",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("combinatorics",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("constructive algorithms",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("data structures",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("dfs and similar",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("divide and conquer",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("dp",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("dsu",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("expression parsing",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("fft",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("flows",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("games",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("geometry",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("graph matchings",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("graphs",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("greedy",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("hashing",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("implementation",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("interactive",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("math",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("matrices",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("meet-in-the-middle",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("number theory",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("probabilities",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("schedules",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("shortest paths",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("sortings",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("string suffix structures",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("strings",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("ternary search",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("trees",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("two pointers",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        }
    }

    private getProblems = async (tag: string):Promise<Problem[]> =>{
        let returnValue = [];
        let fetchData = (await axios.get(`https://codeforces.com/api/problemset.problems?tags=${encodeURI(tag)}`)).data.result;
        let problems:Array<ProblemData> = fetchData.problems;
        let problemStatistics:Array<ProblemStat> = fetchData.problemStatistics;
        for(let i = 0;i<problems.length;i++){
            const currProblem:ProblemData = problems[i];
            const currStat:ProblemStat = problemStatistics[i];
            returnValue.push(new Problem(currProblem.name,
                currProblem.rating,
                currStat.solvedCount,
                currProblem.contestId.toString() + currProblem.index,
                currProblem.tags,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        return returnValue;
        
    }
}


interface ProblemData{
    "contestId": Number,
    "index": string,
    "name": string,
    "type": string,
    "rating": Number,
    "tags": string[]
}
interface ProblemStat{
    "contestId": Number,
    "index": string,
    "solvedCount": Number
}

export const problemBar = vscode.window.registerTreeDataProvider("codeforces",new CfProblemsProvider());



/*-----------------------------Imports-----------------------------*/
import {cf_user_name,cf_pass,sp_user_name,sp_pass,setCF,setSP} from "./userInfo";
import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import axios from "axios";
let browser:puppeteer.Browser|null = null,page:puppeteer.Page|null = null;
const problemTags = [
    "2-sat",
    "binary search",
    "bitmasks",
    "brute force",
    "chinese remainder theorem",
    "combinatorics",
    "constructive algorithms",
    "data structures",
    "dfs and similar",
    "divide and conquer",
    "dp",
    "dsu",
    "expression parsing",
    "fft",
    "flows",
    "games",
    "geometry",
    "graph matchings",
    "graphs",
    "greedy",
    "hashing",
    "implementation",
    "interactive",
    "math",
    "matrices",
    "meet-in-the-middle",
    "number theory",
    "probabilities",
    "schedules",
    "shortest paths",
    "sortings",
    "string suffix structures",
    "strings",
    "ternary search",
    "trees",
    "two pointers"
];

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
        private difficulty:Number|null,
        private userSubmissions:Number|null,
        private problemID:string,
        private tags:string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState 
    ){
        super(label,collapsibleState);
    }

    get tooltip(): string{
        if(this.difficulty === null) {return "";}
        return `${this.tags}`;
    }

    get description(): string{
        if(this.difficulty === null) {return "";}
        return `Difficulty: ${this.difficulty} | Solved Count: ${this.userSubmissions}`;
    }  
}



class CfProblemsProvider implements vscode.TreeDataProvider<Problem>{
    constructor(){}
    getTreeItem(element: Problem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;    
    }
    
    getChildren(element?: Problem | undefined): vscode.ProviderResult<Problem[]> {
        if(element){
            if(element.label === "All"){
                return this.getProblemsByTag("");
            }else if(element.label === "Difficulty"){
                return this.getDifficulties();
            }else if(element.label === "Tags"){
                return this.getTags();
            }else if(element.label === "Favorites"){
                return [];
            }else {
                if(problemTags.includes(element.label)){
                    return this.getProblemsByTag(element.label);
                }else if(parseInt(element.label) >= 800 && parseInt(element.label) <= 3500){
                    return this
                }

            }
        }else{
            return Promise.resolve([
                new Problem("All",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("Difficulty",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("Tags",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
                new Problem("Favorites",null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed),
            ]);
        }
    }
    private getTags = async (): Promise<Problem[]> => {
        let returnTags:Problem[] = [];
        problemTags.forEach(elem => {
            returnTags.push(new Problem(elem,null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed));
        });

        return Promise.resolve(returnTags);
    }
    private getDifficulties = async (): Promise<Problem[]> => {
        let returnDifficulties:Problem[] = [];
        for(let i = 800;i<=3500;i+=100){
            returnDifficulties.push(new Problem(i.toString(),null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed));
        }
        return Promise.resolve(returnDifficulties);
    }
    private getProblemByDifficulty = async (difficultyRating: number):Promise<Problem[]> => {
        const firstPage = await axios.get(`https://codeforces.com/problemset?tags=${difficultyRating}-${difficultyRating}`);
        // const 
        
        return [];
    }
    private getProblemsByTag = async (tag: string):Promise<Problem[]> =>{
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



import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import axios from "axios";
import { User } from "./interfaces/user";
import {Puppet} from "./puppet";
import {problemTags,recommendedTags} from "./constants";


class ExplorerViewItem extends vscode.TreeItem{
    difficulty?:number;
    solvedCount?:number;
    tags?:string[];
    
    constructor(readonly label:string,readonly collapsibleState: vscode.TreeItemCollapsibleState){
        super(label,collapsibleState);
    }

    get tooltip(): string{
        if(!!!this.difficulty) {return "";}
        return `${this.tags}`;
    }

    get description(): string{
        if(!!!this.difficulty) {
            return "";
        }
        if(isNaN(this.difficulty)){
            return `Solved Count: ${this.solvedCount}`;    
        }
        return `Difficulty: ${this.difficulty} | Solved Count: ${this.solvedCount}`;
    }  
}

class ExplorerViewItemBuilder {
    private readonly item: ExplorerViewItem;

    constructor(label:string,collapsibleState:vscode.TreeItemCollapsibleState) {
        this.item = new ExplorerViewItem(label,collapsibleState);
    }
    
  
    difficulty(diff: number|undefined): ExplorerViewItemBuilder {
      this.item.difficulty = diff; 
      return this;
    }
    
    userSubmissions(subs: number|undefined): ExplorerViewItemBuilder {
      this.item.solvedCount = subs;
      return this;
    }

    id(id:string|undefined): ExplorerViewItemBuilder{
        this.item.id = id;
        return this;
    } 

    tags(problemTags:string[] | undefined): ExplorerViewItemBuilder{
        this.item.tags = problemTags;
        return this;
    }

    contextValue(context : string|undefined): ExplorerViewItemBuilder{
        this.item.contextValue = context;
        return this;
    }

    iconPath(path: string|undefined): ExplorerViewItemBuilder{
        this.item.iconPath = path;
        return this;        
    }

    command(comm:vscode.Command | undefined) : ExplorerViewItemBuilder{
        this.item.command = comm;
        return this;
    }
    build(): ExplorerViewItem {
      return this.item;
    }
}


export class CodeforcesDataProvider implements vscode.TreeDataProvider<ExplorerViewItem>{
    ascendingDifficulty:boolean;
    ascendingSubmission:boolean;
    sortByProp:number;
    puppet:Puppet;
    _onDidChangeTreeData: vscode.EventEmitter<ExplorerViewItem | undefined> = new vscode.EventEmitter<ExplorerViewItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ExplorerViewItem | undefined> = this._onDidChangeTreeData.event;

    constructor(puppet:Puppet){
        this.puppet = puppet;
        this.ascendingDifficulty = this.ascendingSubmission = true;
        this.sortByProp = 0;
    }
       
    refresh(sortingMethod:number):void {
        this.sortByProp = sortingMethod;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ExplorerViewItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;    
    }
    sortByDifficulty = (p1:ExplorerViewItem,p2:ExplorerViewItem):number=>{
        return <number>p1.difficulty - <number>p2.difficulty;
    }
    sortBySubmission = (p1:ExplorerViewItem,p2:ExplorerViewItem):number=>{
        return <number>p1.userSubmissions - <number>p2.userSubmissions;
    }
    sortingUtil = (inputArray:ExplorerViewItem[]):ExplorerViewItem[]=>{
        if(this.sortByProp === 0){
            if(this.ascendingDifficulty === true){
                this.ascendingDifficulty = false;
                inputArray.sort(this.sortByDifficulty);
                return inputArray;
            }else{
                this.ascendingDifficulty = true;
                inputArray.sort((a:ExplorerViewItem,b:ExplorerViewItem) => -1*this.sortByDifficulty(a,b));
                return inputArray;
            }
        }else{
            if(this.ascendingSubmission === true){
                this.ascendingSubmission = false;
                inputArray.sort(this.sortBySubmission);
                return inputArray;
            }else{
                this.ascendingSubmission = true;
                inputArray.sort((a:ExplorerViewItem,b:ExplorerViewItem) => -1*this.sortBySubmission(a,b));
                return inputArray;
            }
        }
    }
    getChildren(element?: ExplorerViewItem | undefined): vscode.ProviderResult<ExplorerViewItem[]> {
        if(this.puppet.user.username === ""){
            return Promise.resolve([
                (new ExplorerViewItemBuilder("Sign in to Codeforces",vscode.TreeItemCollapsibleState.None))
                .command({
                    command: "codeforces.SignIn",
                    title: "Codeforces Sign-In"
                }).id("Codeforces Sign-In")
                .build()
            ]);
        }
        
        if(element){
            if(element.label === "All"){
                return this.puppet.getProblemsByTag("")
                .then(arr => { 
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None))
                        .userSubmissions(itr.solvedCount)
                        .tags(itr.tags)
                        .id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? "../media/greenTick.svg" : 
                            (this.puppet.user.unsolvedProblems.has(id) ? "../media/redCross.svg" : undefined))
                        )
                        .difficulty(itr.rating)
                        .contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem"
                        })
                        .build();
                    });
                });
            }else if(element.label === "Difficulty"){
                const diffs: ExplorerViewItem[] = [];
                for(let i = 800;i<=3500;i += 100){
                    diffs.push((new ExplorerViewItemBuilder(i.toString(),vscode.TreeItemCollapsibleState.Collapsed).userSubmissions(undefined).tags(undefined).id(i.toString()).iconPath(undefined).difficulty(undefined).contextValue("topCategory").command(undefined).build()))
                }
                return diffs;
            }else if(element.label === "Tags"){
                return problemTags.map(itr =>{
                    return (new ExplorerViewItemBuilder(itr,vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id(itr).iconPath(undefined).difficulty(undefined).contextValue("topCategory").command(undefined).build();
                });
            }else if(element.label === "Favorites"){
                return this.puppet.getFavoriteProblems()
                    .then(arr => {
                        return arr.map(itr => {
                            const id:string = itr.contestId as number + (itr.index as string);
                            return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                            .iconPath(
                                (this.puppet.user.solvedProblems.has(id) ? "../media/greenTick.svg" : 
                                (this.puppet.user.unsolvedProblems.has(id) ? "../media/redCross.svg" : undefined))
                            ).difficulty(itr.rating).contextValue(undefined)
                            .command({
                                command: "codeforces.displayProblem",
                                title: "Display Problem"
                            }).build();
                        });
                    });
            }else if(element.label === "Recommended Problems"){
                return recommendedTags.map(itr => {
                    return (new ExplorerViewItemBuilder(itr,vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id(itr).iconPath(undefined).difficulty(undefined).contextValue(undefined).command(undefined).build();
                });
            }else if(parseInt(element.label) >= 800 && parseInt(element.label) <= 3500){
                return this.puppet.getProblemsByDifficulty(parseInt(element.label))
                .then(arr => {
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? "../media/greenTick.svg" : 
                            (this.puppet.user.unsolvedProblems.has(id) ? "../media/redCross.svg" : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem"
                        }).build();
                    });
                });
            }else if(problemTags.includes(element.label)){
                return this.puppet.getProblemsByTag(element.label)
                .then(arr => {
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? "../media/greenTick.svg" : 
                            (this.puppet.user.unsolvedProblems.has(id) ? "../media/redCross.svg" : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem"
                        }).build();
                    });
                });
            }else if(recommendedTags.includes(element.label)){
                return this.puppet.getRecommendedProblemsByTag(element.label)
                .then(arr => {
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? "../media/greenTick.svg" : 
                            (this.puppet.user.unsolvedProblems.has(id) ? "../media/redCross.svg" : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem"
                        }).build();
                    });
                });
            }
        }else{
            return Promise.resolve(
                [
                    (new ExplorerViewItemBuilder("All",vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id("All").iconPath(undefined).difficulty(undefined).contextValue("topCategory").command(undefined).build(),
                    (new ExplorerViewItemBuilder("Difficulty",vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id("Difficulty").iconPath(undefined).difficulty(undefined).contextValue(undefined).command(undefined).build(),
                    (new ExplorerViewItemBuilder("Tags",vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id("Tags").iconPath(undefined).difficulty(undefined).contextValue(undefined).command(undefined).build(),
                    (new ExplorerViewItemBuilder("Favorites",vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id("Favorites").iconPath(undefined).difficulty(undefined).contextValue(undefined).command(undefined).build(),
                    (new ExplorerViewItemBuilder("Recommended Problems",vscode.TreeItemCollapsibleState.Collapsed)).userSubmissions(undefined).tags(undefined).id("Recommended Problems").iconPath(undefined).difficulty(undefined).contextValue(undefined).command(undefined).build()
                ]
            );
        }
            
            
    }


    displaySelectedProblemInView = async (inputProblemId:string):Promise<void> => {
        const panel = vscode.window.createWebviewPanel(
            'codeforces',
            inputProblemId,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
          );

        panel.webview.onDidReceiveMessage(async (message) => {
            switch(message.command) {
                case "submit":
                    await this.puppet.submitCodeToCf(message.text,message.lang,inputProblemId);
            }
        });
        
        const parseProblem = async (inputProblemId:string):Promise<string> => {
            let finalMarkDown:string = "";
            inputProblemId = inputProblemId.substr(0,inputProblemId.length-1) + "/" + inputProblemId[inputProblemId.length-1];
            const bodyHTML = (await axios.get(`https://codeforces.com/problemset/problem/${inputProblemId}`)).data;
            const $ = await cheerio.load(bodyHTML);
            const problemName = $(".title").text().trim();
            const timeLimitPerTest = $(".time-limit").text().trim().replace("time limit per test","").trim();
            const memoryLimitPerTest = $(".memory-limit").text().trim().replace("memory limit per test","").trim();
            const inputType = $(".input-file").text().trim().substring(5).trim();
            const outputType = $(".output-file").text().trim().substring(6).trim();
            const problemStatement = $(".problem-statement").html() as string;
            
            return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width">
                   
                </head>
                <body>
                    ${problemStatement}
                    <br/>
                    <p><strong>Paste your code here : </strong></p>
                    <br/>
                    <textarea id="codebox" rows="10" cols="33" ></textarea>
                    <br/>
                    <br/>
                    <select id="lang">
                        <option value="54">C++</option>
                        <option value="60">Java</option>
                        <option value="31">Python</option>
                    </select>
                    <button type="submit" id="submit">Submit</button>
                    
                    <script>
                        const vscode = acquireVsCodeApi();
                        const codeBtn = document.querySelector("#submit");
                        
                        
                        codeBtn.addEventListener("click",function(){
                            let code = document.querySelector("#codebox").value;
                            let language = document.querySelector("#lang").value;
                            vscode.postMessage({
                                command: "submit",
                                text:code,
                                lang: language
                            });
                        });
                    </script>
                </body>
            </html>
            `;
        };


        panel.webview.html = await parseProblem(inputProblemId);

    };
    
}

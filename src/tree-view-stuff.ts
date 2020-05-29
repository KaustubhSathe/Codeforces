import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import * as path from "path";
import * as cheerio from "cheerio";
import axios from "axios";
import { User } from "./interfaces/user";
import {Puppet} from "./puppet";
import {problemTags,recommendedTags} from "./constants";
import { ProblemData } from "./interfaces/ProblemData";


class ExplorerViewItem extends vscode.TreeItem{
    difficulty?:number;
    solvedCount?:number;
    tags?:string[];
    problemId?:string;
    
    constructor(readonly label:string,readonly collapsibleState: vscode.TreeItemCollapsibleState){
        super(label,collapsibleState);
    }

    get tooltip(): string{
        if(!!!this.difficulty) {return "";}
        return `${this.tags}`;
    }

    get description(): string{
        if(this.difficulty===undefined && this.solvedCount===undefined) {
            return "";
        }
        if(isNaN(this.difficulty as number) && this.solvedCount !== undefined){
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
        this.item.problemId = id;
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
        return <number>p1.solvedCount - <number>p2.solvedCount;
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
                            (this.puppet.user.solvedProblems.has(id) ? path.join(__dirname,"..","media","greenTick.svg"): 
                            (this.puppet.user.unsolvedProblems.has(id) ? path.join(__dirname,"..","media","redCross.png") : undefined))
                        )
                        .difficulty(itr.rating)
                        .contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem",
                            arguments: [id]
                        })
                        .build();
                    });
                }).then(elem => this.sortingUtil(elem));
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
                                (this.puppet.user.solvedProblems.has(id) ? path.join(__dirname,"..","media","greenTick.svg"): 
                            (this.puppet.user.unsolvedProblems.has(id) ? path.join(__dirname,"..","media","redCross.png") : undefined))
                            ).difficulty(itr.rating).contextValue(undefined)
                            .command({
                                command: "codeforces.displayProblem",
                                title: "Display Problem",
                                arguments: [id]
                            }).build();
                        });
                    }).then(elem => this.sortingUtil(elem));
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
                            (this.puppet.user.solvedProblems.has(id) ? path.join(__dirname,"..","media","greenTick.svg"): 
                            (this.puppet.user.unsolvedProblems.has(id) ? path.join(__dirname,"..","media","redCross.png") : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem",
                            arguments: [id]
                        }).build();
                    });
                }).then(elem => this.sortingUtil(elem));
            }else if(problemTags.includes(element.label)){
                return this.puppet.getProblemsByTag(element.label)
                .then(arr => {
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? path.join(__dirname,"..","media","greenTick.svg"): 
                            (this.puppet.user.unsolvedProblems.has(id) ? path.join(__dirname,"..","media","redCross.png") : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem",
                            arguments: [id]
                        }).build();
                    });
                }).then(elem => this.sortingUtil(elem));
            }else if(recommendedTags.includes(element.label)){
                return this.puppet.getRecommendedProblemsByTag(element.label)
                .then(arr => {
                    return arr.map(itr => {
                        const id:string = itr.contestId as number + (itr.index as string);
                        return (new ExplorerViewItemBuilder(itr.name as string,vscode.TreeItemCollapsibleState.None)).userSubmissions(itr.solvedCount).tags(itr.tags).id(id)
                        .iconPath(
                            (this.puppet.user.solvedProblems.has(id) ? path.join(__dirname,"..","media","greenTick.svg"): 
                            (this.puppet.user.unsolvedProblems.has(id) ? path.join(__dirname,"..","media","redCross.png") : undefined))
                        ).difficulty(itr.rating).contextValue(undefined)
                        .command({
                            command: "codeforces.displayProblem",
                            title: "Display Problem",
                            arguments: [id]
                        }).build();
                    });
                }).then(elem => this.sortingUtil(elem));
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
    
        const parseProblem = async (problemId:string):Promise<string> => {
            const problem:ProblemData = await this.puppet.extractProblemData(`https://codeforces.com/problemset/problem/${problemId.substr(0,problemId.length-1)}/${problemId[problemId.length-1]}`)
            
            return `
            <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
                        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
                        <meta name="viewport" content="width=device-width">
                        <style>
                            .header{
                                margin-left:auto;
                                margin-right:auto;
                                text-align:center;
                            }
                        #title{
                            font-size:30px;
                            margin-top:4px;
                            margin-bottom:4px;
                        }
                        #time-limit{
                            margin-top:4px;
                            margin-bottom:4px;
                        }
                        #memory-limit{
                            margin-top:4px;
                            margin-bottom:4px;
                        }
                        #input-type{
                            margin-top:4px;
                            margin-bottom:4px;
                        }
                        #output-type{
                            margin-top:4px;
                            margin-bottom:4px;
                        }
                        
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <p id="title">${problem.name}</p>
                            <p id="time-limit">time limit per test : ${problem.timeLimit}</p>
                            <p id="memory-limit">memory limit per test : ${problem.memoryLimit}</p>
                            <p id="input-type">input: ${problem.inputType}</p>
                            <p id="output-type">output: ${problem.outputType}</p>
                        </div>
                        <hr/>

                        <div>
                            ${problem.problemStatement}
                        </div>
                        <hr/>

                        <div>
                            ${problem.inputSpecification}
                        </div>
                        <hr/>


                        <div>
                            ${problem.outputSpecification}
                        </div>
                        <hr/>

                        <div>
                            ${problem.sampleTests}
                        </div>
                        <hr/>

                        <div>
                            ${problem.note}
                        </div>
                        <hr/>


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

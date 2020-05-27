import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import axios from "axios";
import { User } from "./interfaces/user";
import {Puppet} from "./puppet";


class ExplorerViewItem extends vscode.TreeItem{
    difficulty?:number;
    userSubmissions?:number;
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
            return `Solved Count: ${this.userSubmissions}`;    
        }
        return `Difficulty: ${this.difficulty} | Solved Count: ${this.userSubmissions}`;
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
      this.item.userSubmissions = subs;
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


export class CfProblemsProvider implements vscode.TreeDataProvider<ExplorerViewItem>{
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
        if(element){
            if(element.label === "All"){
                return Promise.resolve(this.getProblemsByTag("")).then(elem => this.sortingUtil(elem));                
            }else if(element.label === "Difficulty"){
                return this.getDifficulties();
            }else if(element.label === "Tags"){
                return this.getTags();
            }else if(element.label === "Favorites"){
                if(cf_user_name === null){
                    return this.favoriteSignInPrompt();   
                }else{
                    return this.getFavoriteProblems().then(elem => this.sortingUtil(elem));
                }
            }else if(element.label === "Recommended Problems"){
                if(cf_user_name === null){
                    return this.recommendedProblemSignInPrompt();
                }else{
                    return this.getRecommendedTags();
                }
            }else {
                if(problemTags.includes(element.label)){
                    return this.getProblemsByTag(element.label).then(elem => this.sortingUtil(elem));
                }else if(recommendedTags.includes(element.label)){
                    return this.getRecommendedProblemsByTag(element.label);
                }else if(parseInt(element.label) >= 800 && parseInt(element.label) <= 3500){
                    return this.getProblemsByDifficulty(parseInt(element.label)).then(elem => this.sortingUtil(elem));
                }
            }
        }else{
            return Promise.resolve([
                (new ExplorerViewItemBuilder("Sign in to Codeforces",vscode.TreeItemCollapsibleState.None))
                .command({
                    command: "codeforces.SignIn",
                    title: "Codeforces Sign-In"
                }).id("Codeforces Sign-In")
                .build()
            ]);
        }
    }
}

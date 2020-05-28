import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import axios from "axios";
import {User} from "./interfaces/user";
import { ProblemData } from "./interfaces/ProblemData";

export class Puppet{
    browser?:puppeteer.Browser;
    user: User;
    constructor(){
        this.user = {
            password : "",
            username : "",
            solvedProblems : new Map<string,string>(),
            unsolvedProblems : new Map<string,string>()
        };
    }
    setUsername = (username:string) =>{
        this.user.username= username;
    };

    setPassword = (password : string) => {
        this.user.password = password;
    };

    signInCF = async (username:string,password:string) : Promise<boolean> => {
        if(this.browser === undefined){
            this.browser = await puppeteer.launch({ headless:true });
        }
        this.browser = this.browser as puppeteer.Browser;
        let page:puppeteer.Page = await this.browser.newPage();
        
        await page.goto("https://codeforces.com/enter?back=%2F");
        await page.type("#handleOrEmail",username);
        await page.type("#password",password);
        await Promise.all([
            page.waitForNavigation(),
            page.click("#enterForm > table > tbody > tr:nth-child(4) > td > div:nth-child(1) > input")
        ]);
        if(page.url() === "https://codeforces.com/enter?back=%2F"){
            page.close();
            return false;
        }
        page.close();
        return true;
    };
    
    signIntoCfFlow = async ():Promise<void> => {
        if(this.user !== undefined){
            vscode.window.showInformationMessage(`Already Signed in as ${this.user.username}. If you want to change then please type ahead.`);
        }
        const verify = (input : string|undefined): boolean => {
            const items = input?.split(" ");
            if(items === undefined||items.length !== 2){return false;}
            return true;
        };

        const getUserProblems = async ():Promise<void> => {
            const problems:Array<any> = ((await axios.get(`https://codeforces.com/api/user.status?handle=${this.user?.username}`)) as any).result;
                
            for(let i = 0;i<problems.length;i++){
                const elem:any = problems[i];
                const id = elem.problem.contestId + elem.problem.index;
                const verdict = elem.verdict;
                if(this.user.solvedProblems.has(id)){
                    continue;
                }

                if(verdict !== "OK"){
                    if(!this.user.unsolvedProblems.has(id)){
                        this.user.unsolvedProblems.set(id,"WRONG_ANSWER");
                    }
                }else{
                    if(this.user.unsolvedProblems.has(id)){
                        this.user.unsolvedProblems.delete(id);
                    }
                    this.user.solvedProblems.set(id,"ACCEPTED");
                }
            }
        };
        
        while(true){
            let input: string|undefined = await vscode.window.showInputBox({placeHolder:"Please enter your codeforces username and password SPACE SEPERATED"});  
            if(!verify(input)){
                if(input === undefined){break;}
                vscode.window.showErrorMessage("Please enter Username and Password SPACE SEPERATED.");
            }else{
                input = input as string;
                const [username,password] = input.split(" ");
                const ok:boolean = await this.signInCF(username,password);
                if(!ok){
                    vscode.window.showErrorMessage("Wrong Username or Password entered! Please try again.");
                    continue;
                }
                this.setUsername(username);
                this.setPassword(password);
                await getUserProblems();
                vscode.window.showInformationMessage("Succesfully signed in as : " + this.user?.username);
                break;
            }
        }
    };

    extractProblemData = async (url:string):Promise<ProblemData>=> {
        let bodyHTML = (await axios.get(url)).data;
        const $ = await cheerio.load(bodyHTML);
        const problem:ProblemData = {};
        problem.name = $("#pageContent > div.problemindexholder > div > div > div.header > div.title").text().trim();
        problem.timeLimit = $("#pageContent > div.problemindexholder > div > div > div.header > div.time-limit").text().trim().replace("time limit per test","");
        problem.memoryLimit = $("#pageContent > div.problemindexholder > div > div > div.header > div.memory-limit").text().trim().replace("memory limit per test","");
        problem.inputType = $("#pageContent > div.problemindexholder > div > div > div.header > div.input-file").text().trim().substring(5);
        problem.outputType = $("#pageContent > div.problemindexholder > div > div > div.header > div.output-file").text().trim().substring(6);
        problem.problemStatement = $("#pageContent > div.problemindexholder > div > div > div:nth-child(2)").html()?.toString().trim();
        problem.inputSpecification = $(".input-specification").html()?.toString().trim();
        problem.outputSpecification = $(".output-specification").html()?.toString().trim();
        problem.sampleTests = $("#pageContent > div.problemindexholder > div > div > div.sample-tests").html()?.toString().trim();
        problem.note = $("#pageContent > div.problemindexholder > div > div > div.note").html()?.toString().trim();
        problem.contestId = parseInt(url.split("/")[url.split("/").length - 2]);
        problem.index = url[url.length - 1];
        problem.type = "PROGRAMMING";
        problem.rating=  parseInt($(`span[title="Difficulty"]`).text().trim().replace("*",""));
        problem.tags = $(`div[style="padding: 0.5em;"]`).children().toArray()
                        .filter((elem,i,arr) => i<=arr.length-3)
                        .map(elem => $(elem).text().trim());
        problem.solvedCount = undefined;
        

        return problem;
    };
    getRecommendedProblemsByTag = async (inputTag: string):Promise<ProblemData[]> =>{
        let body = (await axios.get(`https://recommender.codedrills.io/profile?handles=${this.user.username}`)).data;
        const $ = await cheerio.load(body);
        const totalProblems = $($($("#" + inputTag).children()[2]).children()[0]).children().children().children();
        const problemsRecommended:ProblemData[] = [];
        for(let i = 0;i<totalProblems.length;i++){
            let name = $($(totalProblems[i]).children().children()[0]).text().trim();
            let url = $($($(totalProblems[i]).children().children()[0]).children()[0]).attr("href")?.trim() as string;
            let contestId = parseInt(url.split("/")[url.split("/").length - 2]);
            let index = url[url.length - 1];
            problemsRecommended.push({
                index,contestId,name
            });
        }
        
        return problemsRecommended;
    };

    retrieveProblemsFromPage = async (bodyHTML:string):Promise<ProblemData[]> => {
        const $ = await cheerio.load(bodyHTML);
        const problemTable = $(".problems");
        const problemsInPage = problemTable.children().children();
        let returnProblems: ProblemData[] = [];
        const cleanifyTags = (inputTags:string):string[] => {
            let returnValue:string[] = inputTags.split(",");
            return returnValue.map(elem => elem.trim());
        };
        for(let i = 1;i<problemsInPage.length;i++){
            let id = $($(problemsInPage[i]).children()[0]).text().trim();
            let index:string = id[id.length-1];
            let contestId:number = parseInt(id.substring(0,id.length-1).trim());
            let name = $($($(problemsInPage[i]).children()[1]).children()[0]).text().trim();
            let rating = parseInt($($(problemsInPage[i]).children()[3]).text().trim());
            let tags = cleanifyTags($($($(problemsInPage[i]).children()[1]).children()[1]).text().trim());
            let solvedCount;
            if(!isNaN(rating)){
                solvedCount = parseInt($($(problemsInPage[i]).children()[4]).text().trim().replace("x",""));
            }else{
                solvedCount = parseInt($($(problemsInPage[i]).children()[3]).text().trim().replace("x",""));                            
            }
            returnProblems.push({
                index,contestId,name,rating,tags,solvedCount
            });
        }
        return returnProblems;
    };

    getFavoriteProblems = async ():Promise<ProblemData[]> => {
        if(this.browser === undefined){
            this.browser = await puppeteer.launch({ headless:true });
        }
        const page:puppeteer.Page = await this.browser.newPage();
        await page.goto("https://codeforces.com/favourite/problems");
        
        let bodyHTML = await page.evaluate(() => document.body.innerHTML);
        return this.retrieveProblemsFromPage(bodyHTML);
    };

    getProblemsByTag = async (tag: string):Promise<ProblemData[]> => {
        let returnValue:ProblemData[] = [];
        let fetchData = (await axios.get(`https://codeforces.com/api/problemset.problems?tags=${encodeURI(tag)}`)).data.result;
        let problems:Array<ProblemData> = fetchData.problems;
        let problemStatistics:Array<ProblemData> = fetchData.problemStatistics;
        for(let i = 0;i<problems.length;i++){
            const problem:ProblemData = problems[i];
            problem.solvedCount = problemStatistics[i].solvedCount;
            returnValue.push(problem);
        }
        return returnValue;
    };


    
    getProblemsByDifficulty = async (difficultyRating: number):Promise<ProblemData[]> => {
        const firstPage = (await axios.get(`https://codeforces.com/problemset/page/1?tags=${difficultyRating}-${difficultyRating}`)).data;
        const $ = await cheerio.load(firstPage);
        const numberOfPages = $(".pagination").children().children().length-2;
        let problems:any[] = [];

        for(let i = 1;i<=numberOfPages;i++){
            problems.push(async ():Promise<ProblemData[]> => {
                const tempPage = (await axios.get(`https://codeforces.com/problemset/page/${i}?tags=${difficultyRating}-${difficultyRating}`)).data;
                const tempProblems = await this.retrieveProblemsFromPage(tempPage);
                return tempProblems;
            });
        }
        
        return axios.all(problems);
    };
    
}










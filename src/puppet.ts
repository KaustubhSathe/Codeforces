import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import axios from "axios";
import {User} from "./interfaces/user";
import { ProblemData } from "./interfaces/ProblemData";

export class Puppet{
    browser?:puppeteer.Browser;
    user?: User;
    constructor(){}

    

    setUsername = (username:string) =>{
        if(this.user !== undefined){
            this.user.username= username;
        }
    };

    setPassword = (password : string) => {
        if(this.user !== undefined){
            this.user.password = password;
        }
    };

    signInCF = async (username:string,password:string) : Promise<boolean> => {
        if(!!!this.browser){
            await this.initPuppet();
        }
        this.browser = this.browser as puppeteer.Browser;
        let page = await this.browser.newPage();
        
        await this.page.goto("https://codeforces.com/enter?back=%2F");
        await this.page.type("#handleOrEmail",username);
        await this.page.type("#password",password);
        await Promise.all([
            this.page.waitForNavigation(),
            this.page.click("#enterForm > table > tbody > tr:nth-child(4) > td > div:nth-child(1) > input")
        ]);
    
        if(this.page.url() === "https://codeforces.com/enter?back=%2F"){
            return false;
        }
        
        return true;
    };
    
    signIntoCfFlow = async ():Promise<void> => {
        if(!!!this.user){
            vscode.window.showInformationMessage("Already Signed in as "+this.username+". If you want to change then please type ahead.");
        }
        while(true){
            let input: string|undefined = await vscode.window.showInputBox({placeHolder:"Please enter your codeforces username and password SPACE SEPERATED"});
            if(!this.verify(input)){
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
                vscode.window.showInformationMessage("Succesfully signed in as : " + username);
                break;
            }
        }
    };

    verify = (input : string|undefined): boolean => {
        const items = input?.split(" ");
        if(items === undefined||items.length !== 2){return false;}
        return true;
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
        let body = (await axios.get(`https://recommender.codedrills.io/profile?handles=${cf_user_name}`)).data;
        const $ = await cheerio.load(body);
        const totalProblems = $($($("#" + inputTag).children()[2]).children()[0]).children().children().children();
        const problemsRecommended:ProblemData[] = [];
        for(let i = 0;i<totalProblems.length;i++){
            let name = $($(totalProblems[i]).children().children()[0]).text().trim();
            let url = $($($(totalProblems[i]).children().children()[0]).children()[0]).attr("href")?.trim() as string;
            let contestId = parseInt(url.split("/")[url.split("/").length - 2]);
            let index = url[url.length - 1];
            problemsRecommended.push({
                index,contestId
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
        if(!!!this.browser){
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


    private getDifficulties = async (): Promise<Problem[]> => {
        let returnDifficulties:Problem[] = [];
        for(let i = 800;i<=3500;i+=100){
            returnDifficulties.push(new Problem(i.toString(),null,null,"",[],vscode.TreeItemCollapsibleState.Collapsed,"topCategory"));
        }
        return Promise.resolve(returnDifficulties);
    };
    private getProblemsByDifficulty = async (difficultyRating: number):Promise<Problem[]> => {
        const firstPage = (await axios.get(`https://codeforces.com/problemset/page/1?tags=${difficultyRating}-${difficultyRating}`)).data;
        const $ = await cheerio.load(firstPage);
        const numberOfPages = $(".pagination").children().children().length-2;
        let returnProblems:Problem[] = [];
        for(let i = 1;i<=numberOfPages;i++){
            if(i === 1){
                const tempPage = firstPage;
                const tempProblems = await this.retrieveProblemsFromPage(tempPage);
                tempProblems.forEach(elem => returnProblems.push(elem));
            }else{  
                const tempPage = (await axios.get(`https://codeforces.com/problemset/page/${i}?tags=${difficultyRating}-${difficultyRating}`)).data;
                const tempProblems = await this.retrieveProblemsFromPage(tempPage);
                tempProblems.forEach(elem => returnProblems.push(elem));
            }
        }
        
        return returnProblems;
    };
    
    displaySelectedProblemInView = async (inputProblemId:string):Promise<void> => {
        const panel = vscode.window.createWebviewPanel(
            'codeforces',
            inputProblemId,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
          );

        const submitCodeToCf = async (code:string,lang:string):Promise<void> => {
            page = page as puppeteer.Page;    
            vscode.window.showInformationMessage(`Submitting your submission for problem ${inputProblemId}.`);
            await page.goto("https://codeforces.com/problemset/submit");
            await page.type("#pageContent > form > table > tbody > tr:nth-child(1) > td:nth-child(2) > input",inputProblemId);
            await page.select("#pageContent > form > table > tbody > tr:nth-child(3) > td:nth-child(2) > select",lang);
            await page.type("#sourceCodeTextarea",code);

            await Promise.all([
                page.waitForNavigation(),
                page.click("#pageContent > form > table > tbody > tr:nth-child(6) > td > div > div > input")
            ]);
            
            await page.goto(`https://codeforces.com/contest/${inputProblemId.substring(0,inputProblemId.length-1)}/my`);
            try {
                let temp;
                while(true){
                    const temp:string = await page.evaluate(() => document.querySelector("#pageContent > div.datatable > div:nth-child(6) > table > tbody > tr:nth-child(2) > td.status-cell.status-small.status-verdict-cell.dark > span")?.textContent) as string;
                    if(temp.includes("Running on test") || temp.includes("In queue") || temp.includes("Running")){
                        setTimeout(()=>{},1000);
                    }else{
                        break;
                    }   
                }    
                const aaoaa:string = await page.evaluate(() => document.querySelector("#pageContent > div.datatable > div:nth-child(6) > table > tbody > tr:nth-child(2) > td.status-cell.status-small.status-verdict-cell.dark > span")?.textContent) as string;
                console.log(aaoaa);
                vscode.window.showInformationMessage(`Your submission to problem ${inputProblemId} has ${aaoaa}.`);
            } catch (error) {
                console.log("Stuck in queue.");
            }

        }

        panel.webview.onDidReceiveMessage(async (message) => {
            switch(message.command) {
                case "submit":
                    await submitCodeToCf(message.text,message.lang);
            }
        });
        
        panel.webview.html = await this.parseProblem(inputProblemId);
    };
    private parseProblem = async (inputProblemId:string):Promise<string> => {
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

}










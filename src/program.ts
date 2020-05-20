/*-----------------------------Imports-----------------------------*/
import {cf_user_name,cf_pass,sp_user_name,sp_pass,setCF,setSP} from "./userInfo";
import * as vscode from "vscode";
import * as puppeteer from "puppeteer";
let browser:puppeteer.Browser|null = null,page:puppeteer.Page|null = null;
/*-----------------------------Puppeteer Stuff-----------------------------*/

const initPuppeteer = async () => {
    browser = await puppeteer.launch({headless:true});
    page = await browser.newPage();
}

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

/*-----------------------------Codeforces Sign In-----------------------------*/
export const cfDisposable = vscode.commands.registerCommand("cpsolver.cfSignIn",async () => {
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



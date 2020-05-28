export interface User{
    username:string;
    password:string;
    solvedProblems: Map<string,string>;
    unsolvedProblems : Map<string,string>;
}
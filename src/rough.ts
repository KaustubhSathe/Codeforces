import {ProblemData} from "./interfaces/ProblemData";
import axios from "axios";
import * as cheerio from "cheerio";

const extractProblemData = async (url:string):Promise<void>=> {
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
    
    console.log(problem);
};

let temp:Object = {}

console.log(temp.aaoaa);
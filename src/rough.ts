import axios from "axios";
async function foo(){
    let cfProblems = (await axios.get(`https://codeforces.com/api/problemset.problems?tags=${encodeURI("")}`)).data.result.problems;
    console.log(cfProblems.length);
}

foo();


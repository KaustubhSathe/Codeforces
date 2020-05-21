import axios from "axios";

async function foo(){
    const firstPage = (await axios.get(`https://codeforces.com/problemset?tags=${1800}-${1800}`)).data;
    console.log(firstPage);
}

foo();
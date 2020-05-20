let cf_user_name:string|null  = null;
let cf_pass:string|null  = null;
let setCF = (usr:string,pass:string) => {
    cf_user_name = usr;
    cf_pass = pass;
}

let sp_user_name:string|null  = null;
let sp_pass:string|null  = null;
let setSP = (usr:string,pass:string) => {
    sp_user_name = usr;
    sp_pass = pass;
}

export {
    cf_user_name,
    cf_pass,
    setCF,
    sp_pass,
    sp_user_name,
    setSP
};

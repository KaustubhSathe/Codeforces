// Problem data returned by api call
export interface ProblemData{
    contestId?: number,
    index?: string,
    type?: string,
    rating?: number,
    tags?: string[],
    solvedCount?: number,
    name?: string,
    timeLimit?: string,
    memoryLimit?: string,
    inputType?: string,
    outputType?: string,
    problemStatement?: string,
    inputSpecification?: string,
    outputSpecification?: string,
    sampleTests?: string,
    note?: string
}





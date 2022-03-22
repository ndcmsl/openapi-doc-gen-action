import { exec } from 'child_process';
import { getInput, setFailed } from '@actions/core';
import { Octokit } from "@octokit/rest";

const token: string = getInput('token');
const owner: string = getInput('repo').split("/")[0];
const repo: string = getInput('repo').split("/")[1];
const octokit = new Octokit({
    auth: token
});

async function getTopics(): Promise<any> {
    return await octokit.rest.repos.getAllTopics({
        owner,
        repo
    });
}

function genApiDocs(): void {
    const result = exec('DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true npx nest start');
    console.log(result.stdout);
    pushCommit();
}

function pushCommit(): void {
    console.log("HEHEHE")
    exec(`git config --global user.email "actions@github.com" && \
            git config --global user.name "Github Action" && \
            git add openapi.json && \
            git commit -m "chore: update API docs [skip ci]" && \
            git push https://${token}@github.com/${owner}/${repo}.git`);
}

async function main(): Promise<void> {
    const { data } = await getTopics();
    if(data.names.includes('microservice')) {
        genApiDocs();
    }
}

try {
    main();
} catch (error) {
    setFailed(error);
}

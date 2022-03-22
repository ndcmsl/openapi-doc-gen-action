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
    exec('DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true npx nest start');
    exec('git diff --name-only | grep openapi.json', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        if (stdout == 'openapi.json')
            pushCommit();
    });
}

function pushCommit(): void {
    exec(`git config --global user.email "actions@github.com" && \
            git config --global user.name "Github Action" && \
            git add openapi.json && \
            git commit -m "chore: update API docs [skip ci]" && \
            git push https://${token}@github.com/${owner}/${repo}.git`);
}

async function main(): Promise<void> {
    let result: any = await getTopics();
    result.data.names.map(topic => {
        if (topic == 'microservice')
            genApiDocs();
    });
}

try {
    main();    
} catch (error) {
    setFailed(error.message);    
}

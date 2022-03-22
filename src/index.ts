import { exec } from 'child_process';
import { getInput, setFailed, setOutput } from '@actions/core';
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

async function genApiDocs() {
    await exec('DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true npx nest start');
}

async function main(): Promise<void> {
    const { data } = await getTopics();
    const topic = data.names[0];
    if(topic === 'microservice') {
        genApiDocs();
    }
    setOutput('topic', topic);
}

try {
    main();
} catch (error) {
    setFailed(error);
}

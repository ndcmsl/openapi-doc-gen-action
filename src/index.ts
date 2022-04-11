import { exec } from 'child_process';
import { getInput, setFailed, setOutput } from '@actions/core';
import { Octokit } from "@octokit/rest";
const fs = require('fs')

const token: string = getInput('token');
const owner: string = getInput('repo').split("/")[0];
const repo: string = getInput('repo').split("/")[1];
const packageVersion: number = parseInt(getInput('core-nest-module-version').split('.')[1]);
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
    const openApiPath = './openapi.json';
    let apiVersion = '1.0.0';
    if (fs.existsSync(openApiPath)) {
        try{
            const openApiFile = fs.readFileSync(openApiPath);
            apiVersion = JSON.parse(openApiFile)?.info?.version;
        }
        catch (e) {
            throw new Error(`can't read/parse openapi.json`);
        }
    }
    setOutput('apiVersion', apiVersion);
    await exec( `DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true DOC_API_VERSION=${apiVersion} DOC_API_TITLE=${repo} npx nest start`);
}

async function main(): Promise<void> {
    const { data } = await getTopics();
    const topic = data.names[0];
    if(topic === 'microservice' && packageVersion >= 27) {
        await genApiDocs();
    }
    setOutput('topic', topic);
}

try {
    main();
} catch (error) {
    setFailed(error);
}

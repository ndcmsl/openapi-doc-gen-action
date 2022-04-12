import { getInput, setFailed } from '@actions/core';
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
    const { execaSync } = await import("execa");
    const openApiPath = './openapi.json';
    let apiVersion = '1.0.0';
    if (fs.existsSync(openApiPath)) {
        try{
            const openApiFile = fs.readFileSync(openApiPath);
            const { stdout: tags } = execaSync('git tag -l apiV*');
            console.log(tags);
            apiVersion = JSON.parse(openApiFile)?.info?.version;
            if(!tags.includes(apiVersion)){
                updateOpenApiFile(apiVersion);
            }
        }
        catch (e) {
            console.log(e)
            throw new Error(`can't read/parse openapi.json`);
        }
    }
    else {
        updateOpenApiFile(apiVersion);
    }
}

async function updateOpenApiFile(version) {
    const { execaSync } = await import("execa");

    execaSync(`DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true DOC_API_VERSION=${version} DOC_API_TITLE=${repo} npx nest start`, {shell: 'bash'});
    execaSync('git config user.email "actions@github.com"');
    execaSync('git config user.name "Github Action"');
    execaSync('git add openapi.json');
    execaSync(`git commit -m "chore: update API docs to ${version} [skip ci]"`);
    execaSync(`git tag -a -m "Update API" apiV${version}`);
}

async function main(): Promise<void> {
    const { data } = await getTopics();
    const topic = data.names[0];
    if(topic === 'microservice' && packageVersion >= 27) {
        await genApiDocs();
    }
}

try {
    main();
} catch (error) {
    setFailed(error);
}

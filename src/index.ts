import { info, error, getInput, setFailed, setOutput } from '@actions/core';
import { Octokit } from "@octokit/rest";
import { exec } from 'child_process';
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

    info('Checking if openapi file exists...');
    if (fs.existsSync(openApiPath)) {
        info('Openapi file found, checking if version has changed...');
        try{
            const openApiFile = fs.readFileSync(openApiPath);

            apiVersion = JSON.parse(openApiFile)?.info?.version;
            info(`Current api version is ${apiVersion}`);
            exec('git tag -l apiV*', (err, stdout, stderr) => {
                info(`Current tags are ${stdout}`);
                if(err) {
                    error(err.message);
                    throw new Error(err.message);
                }
                else if(stderr) {
                    error(stderr);
                    throw new Error(stderr);
                }
                else if(!stdout.includes(apiVersion)){
                    info('Version not found in previous tags, updating api documentation')
                    updateOpenApiFile(apiVersion, openApiPath);
                }
            });
        }
        catch (e) {
            throw new Error(`can't read/parse openapi.json`);
        }
    }
    else {
        info('Openapi file not found');
        updateOpenApiFile(apiVersion, openApiPath);
    }
}

async function updateOpenApiFile(version, filePath) {
    info('Generating openapi file...');
    await exec(`DOC_API_ACTIVE=true GENERATE_DOCUMENTATION_JSON=true DOC_API_VERSION=${version} DOC_API_TITLE=${repo} npx nest start`);
    if (fs.existsSync(filePath)) {
        info('Done!');
        setOutput('commitDoc', true);
        setOutput('apiVersion', version);
    }
    else {
        throw new Error('Error generating file');
    }

}

async function main(): Promise<void> {
    const { data } = await getTopics();
    const topics = data.names;

    info(`Is microservice: ${topics.includes('microservice')}, Core nest module minor version: ${packageVersion}`);
    if(topics.includes('microservice') && packageVersion >= 27) {
        await genApiDocs();
    }
}

try {
    main();
} catch (error) {
    setFailed(error);
}

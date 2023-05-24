const debug = true;

require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const fsPromises = require('fs').promises;

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.PYMNTS_OPENAI_KEY,
  });
const openai = new OpenAIApi(configuration);
const sleep = seconds => new Promise(r => setTimeout(r, seconds * 1000));

async function turboChatCompletion (prompt, temperature = 0, service = 'You are a helpful, accurate assistant.') {
    /* 
     * NO NEED TO SPECIFY MAX TOKENS
     * role: assistant, system, user
     */


    const request = {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.PYMNTS_OPENAI_KEY}`,
        },
        data: {
            model: "gpt-3.5-turbo",
            temperature,
            messages:[
                {
                    role: 'system',
                    content: service,

                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }
    }

    return axios(request);
}


exports.getTurboResponse = async (prompt, temperature = 0, service = 'You are a helpful, accurate assistant.') => {
    if (debug) console.log('TURBO', prompt);

    if (!prompt.endsWith("\n")) prompt += "\n";

    let result;
    let success = false;
    let count = 0;
    let seconds = 5;
    let maxCount = 8;
    while (!success) {
        try {
            result = await turboChatCompletion(prompt, temperature, service);
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText, err.response.data);
            ++count;
            if (count >= maxCount) {
                return {
                    status: 'error',
                    number: err.response.status,
                    message: err.response,
                }
            }
            seconds *= 2;
            await sleep(seconds);
            console.log('Retrying query');
        }
    }

    const response = {
        status: 'success',
        finishReason: result.data.choices[0].finish_reason,
        content: result.data.choices[0].message.content
    }

    if (debug) console.log(response);

    return response;
}

exports.getGist = async (text, numSentences = 3) => {
    const prompt = `"""Give the overall gist of the Text below in ${numSentences > 1 ? `${numSentences} sentences` : `1 sentence`}.
    
    Text:
    ${text}\n"""\n`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}

exports.getKeywordsAndAffiliations = async (text) => {
    const prompt = `"""Provide a list of keywords and a list of affiliations contained in the following text. The keyword list must include all names of people, organizations, events, products, and services as well as all significant topics, concepts, and ideas. The affiliation list must include the individual's name as well as all titles, roles, and organizations that the individual is affiliated with. The returned format must be stringified JSON in the following format: {
        "keywords": array of keywords goes here,
        "affiliations": array of affiliations goes here
        }
        
        Text:
        ${text}
        """
        `
    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }


    return response.content;
}

exports.getConceptsNamesAndAffiliations = async (text) => {
    const prompt = `"""Provide a list of concepts, names, and affiliations contained in the following text. The concept list must include all significant topics, concepts, and ideas. The names list must include all names of all people, organizations, events, products, and services. The affiliation list must include each individual's name as well as all titles, roles, and organizations that the individual is affiliated with. The returned format must be stringified JSON in the following format: {
        "concepts": array of concepts goes here,
        "names": array of names goes here,
        "affiliations": array of affiliations goes here
        }
        
        Text:
        ${text}
        """
        `
    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }


    return response.content;
}


exports.getOverallTopic = async (text, numWords = 32) => {
    const prompt = `"""In ${numWords} words or less, tell me the overall topic of the following text.

    Text:
    ${text}
    """`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}

exports.getTopicAndGist = async (text, numGistSentences = 3, numTopicWords = 32) => {
    const prompt = `"""In ${numGistSentences > 1 ? `${numGistSentences} sentences` : `1 sentence`} tell me the gist of the following text. Also, in ${numTopicWords} words or less, tell me the overall topic of the following text. The return format must be in stringified JSON in the following format: {
        "gist": gist goes here,
        "topic": topic goes here
    }

    Text:
    ${text}
    """`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }
}

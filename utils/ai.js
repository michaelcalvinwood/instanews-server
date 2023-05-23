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
    let seconds = 30;
    let maxCount = 5;
    while (!success) {
        try {
            result = await turboChatCompletion(prompt, temperature, service);
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response);
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


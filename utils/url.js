require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const articleExtractor = require('@extractus/article-extractor');


const { convert } = require('html-to-text');

const { SCRAPERAPI_KEY } = process.env;

//const url = 'https://www.pymnts.com/news/retail/2023/will-consumers-pay-50-for-drugstore-brand-sunscreen/';

const getBody = async url => {
  let request = {
      url: 'http://api.scraperapi.com',
      params: {
        api_key: SCRAPERAPI_KEY,
        url
      },
      method: 'get',
      headers: {
        "Content-Type": "application/json"
      }
    }
  
    let response;
  
    try {
      response = await axios(request);
    } catch (err) {
      console.error('articleExtractor error:', err);
      return false;
    }
  
    return response.data;
}

const getText = html => {
  const options = {
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'a.button', format: 'skip' }
      ]
    }
    
    let text = convert(html, options);
    let lines = text.split("\n");
    for (let i = 0; i < lines.length; ++i) {
      if (lines[i]) lines[i] = lines[i].trim();
      else lines[i] = "\n";
    }
    text = lines.join(' ');

    return text;
}

exports.articleExtractor = async (url, html = false) => {
  const body = await getBody(url);

  if (body === false) return false;

  let article = await articleExtractor.extractFromHtml(body, url);
  if (!article) return false;
   
  text = getText(article.content);

  return {title: article.title, text, html: article.content, url};
}

exports.articleTextExtractor = async (body) => {
  articleExtractor.setSanitizeHtmlOptions({parseStyleAttributes: false});
  let article = await articleExtractor.extractFromHtml(body);
  console.log('returned article', article);
  if (!article) {
    article = {
      title: 'seed',
      content: body
    }
  }
  
  text = getText(article.content);

  return {title: article.title, text, html: article.content, url: 'seed'};
}

exports.isUrl = url => {
  try {
    const test = new URL(url);
  } catch (err) {
    return false;
  }

  return true;
}




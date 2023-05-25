require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const articleExtractor = require('@extractus/article-extractor');
const { convert } = require('html-to-text');

const { SCRAPERAPI_KEY } = process.env;

//const url = 'https://www.pymnts.com/news/retail/2023/will-consumers-pay-50-for-drugstore-brand-sunscreen/';

exports.articleExtractor = async (url, html = false) => {
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
    console.err('articleExtractor error:', err);
    return false;
  }

  let $ = cheerio.load(response.data);
  const body = $.html($('body'));

  const article = await articleExtractor.extractFromHtml(body, url);

  console.log(article);
  return;


    //let article;
    try {
        article = await articleExtractor.extract(url)
      } catch (err) {
        console.error('articleExtractor error', err);
        return false;
      }

    const options = {
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'a.button', format: 'skip' }
        ]
      }
    const text = convert(article.content, options);
    return {title: article.title, text, html: article.content, url};
}

exports.isUrl = url => {
  try {
    const test = new URL(url);
  } catch (err) {
    return false;
  }

  return true;
}

exports.articleExtractor('https://www.pymnts.com/cfo/2023/todays-macroclimate-calls-for-controlling-whats-controllable/');


const axios = require('axios');
const articleExtractor = require('@extractus/article-extractor');
const { convert } = require('html-to-text');

//const url = 'https://www.pymnts.com/news/retail/2023/will-consumers-pay-50-for-drugstore-brand-sunscreen/';

exports.articleExtractor = async (url, html = false) => {
    let article;
    try {
        article = await articleExtractor.extract(url)
      } catch (err) {
        console.error(err);
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

console.log(exports.isUrl('yoyo'));


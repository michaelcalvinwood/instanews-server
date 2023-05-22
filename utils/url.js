const axios = require('axios');
const articleExtractor = require('@extractus/article-extractor');
const { convert } = require('html-to-text');

//const url = 'https://www.pymnts.com/news/retail/2023/will-consumers-pay-50-for-drugstore-brand-sunscreen/';

exports.articleExtractor = async (url, html = false) => {
    let article;
    try {
        article = await articleExtractor.extract(url)
        console.log(article)
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
    console.log(text);
    return article;
}


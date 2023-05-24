require('dotenv').config();

const { SERPER_API_KEY } = process.env;

exports.urls = async query => {
    const axios = require('axios');
    let data = JSON.stringify({
      "q": query,
      "num": 30
    });
    
    let config = {
      method: 'post',
      url: 'https://google.serper.dev/search',
      headers: { 
        'X-API-KEY': SERPER_API_KEY, 
        'Content-Type': 'application/json'
      },
      data : data
    };
    
    try {
        response = await axios(config)
    } catch (err) {
        console.log('scaleSerp urls error: ', err);
        return false;
    }
    console.log(JSON.stringify(response.data));

    const organic = response.data.organic;

    console.log('organic', organic);

    let result = [];

    for (let i = 0; i < organic.length; ++i) {
        const { title, link, snippet, date } = organic[i];
        //console.log('title, link', title, link,);
        result.push({id: i, title, link, snippet, date});
    }
    
    console.log('result', result);

    return result;
}
require('dotenv').config();
const axios = require('axios');

const {SERPWOW_KEY} = process.env;

exports.urls = async (query, num = 30) => {
    // set up the request parameters
    const params = {
        api_key: SERPWOW_KEY,
        engine: "google",
        search_type: "news",
        q: query,
        gl: "us",
        sort_by: "date",
        num
    }
    
    let response;
    
    try {
        response = await axios.get('https://api.serpwow.com/search', { params });
    } catch (err) {
        console.log('serpWow urls error: ', err);
        return false;
    }
    console.log(JSON.stringify(response.data, 0, 2));

    const organic = response.data.news_results;

    console.log('organic', organic);

    let result = [];

    for (let i = 0; i < organic.length; ++i) {
        const { title, link, domain, snippet, date, date_utc } = organic[i];
        //console.log('title, link', title, link,);
        result.push({id: i, title, link, domain, snippet, date, date_utc});
    }

    console.log('result', result);

    return result;
}
require ('dotenv').config();
const axios = require('axios');

const { SCALE_SERP_API_KEY } = process.env;

exports.urls = async query => {
    const params = {
        api_key: SCALE_SERP_API_KEY,
          q: query,
          location: "New York,NY,United States",
          google_domain: "google.com",
          gl: "us",
          hl: "en",
          time_period: "last_month",
          sort_by: "date"
        }
        
        let response;

        try {
            response = await axios.get('https://api.scaleserp.com/search', { params })
        } catch (err) {
            console.log('scaleSerp urls error: ', err);
            return false;
        }
        console.log(JSON.stringify(response.data, 0, 2));

        const organic = response.data.organic_results;

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
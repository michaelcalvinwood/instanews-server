const listenPort = 6405;
const hostname = 'node.pymnts.com'
const privateKeyPath = `/etc/letsencrypt/live/${hostname}/privkey.pem`;
const fullchainPath = `/etc/letsencrypt/live/${hostname}/fullchain.pem`;

const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');

const urlUtils = require('./utils/url');
const ai = require('./utils/ai');
const nlp = require('./utils/nlp');
const serp = require('./utils/serpWow');
const wp = require('./utils/wordpress');

const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit : 2, //important
    host     : process.env.MYSQL_HOST,
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DATABASE,
    debug    :  false
});

let databaseReady = false;

pool.query("SHOW DATABASES",(err, data) => {
    if(err) {
        console.error(err);
        return;
    }
    // rows fetch
    console.log(data);
    databaseReady = true;
});

const mysqlQuery = query => {
  return new Promise ((resolve, reject) => {
    pool.query(query,(err, data) => {
      if(err) {
          console.error(err);
          return reject(err);
      }
      // rows fetch
      //console.log(data);
      return resolve(data);
  });
  })
}

const credibleDomains = [];

const getCredibleDomains = async () => {
    let result;

    try {
        result = await mysqlQuery('SELECT * FROM credible_domains');
    } catch (err) {
        return console.error('getCredibleDomains error', err);
    }

    result.forEach(entry => credibleDomains.push(entry.domain));

    console.log('credibleDomains', credibleDomains);
}

getCredibleDomains();

const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());

const sleep = seconds => new Promise(r => setTimeout(r, seconds * 1000));

const handleSocketConnection = socket => {
    console.log('connection', socket.id);

    //socket.on('url', (url) => handleUrl(socket, url));
    //socket.on('speakers', (speakerList) => handleSpeakers(socket, speakerList));
}

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

const io = require('socket.io')(httpsServer, {
    cors: {
      origin: "https://instanews.pymnts.com",
      //origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

const sendMessage = (status, msg, socket) => {
    socket.emit('message', {status, msg});
}

const setSourceUrl = async(socket, sourceUrl) => {
    const test = urlUtils.isUrl(sourceUrl);

    if (test === false) return sendMessage('error', 'Please enter a valid URL.', socket);

    sendMessage('success', 'Fetching Source Article', socket);

    const article = await urlUtils.articleExtractor(sourceUrl);

    let { title, text, html} = article;

    text = nlp.nWords(text, 3250).trim();

    sendMessage('success', 'Determining the gist and topic of the article.', socket);

    //const relevantFacts = await ai.getRelevantFacts(text, 3);

    console.log('relevant facts', relevantFacts);

    const shortGist = await ai.getOverallTopic(text, 20);

    console.log('shortGist', shortGist);

    return;

    const removePunctuation = shortGist.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const query = removePunctuation.replace(/\s{2,}/g," ");
    const urls1 = await serp.urls(query);

    console.log(urls1);

    return;



    if (keywordsAndAffiliations === false) return sendMessage('error', 'Could not get keywords and affiliations.', socket);

    keywordsAndAffiliations = keywordsAndAffiliations.replaceAll("\n", "");

    console.log(keywordsAndAffiliations);

    keywordsObj = JSON.parse(keywordsAndAffiliations);
    
    console.log(keywordsObj);

}

const handleInput = async (socket, input) => {
    console.log(input);

    const { topic, query } = input;

    const urls = await serp.urls(query, 50);

    socket.emit('urls', urls);
}

const processUrl = async (url, topic, article, index = 0, sleepStagger = 3) => {
    console.log(`Sleeping [${index}]: ${index * sleepStagger}`);
    if (index) await sleep(index * sleepStagger);

    const {link, id} = url;
    article[id] = {};
    article[id].link = link;

    console.log('link', link);

    article[id].article = await urlUtils.articleExtractor(link);
    if (article[id].article === false) {
        article[id].status = false;
        return false;
    }

    article[id].facts = await ai.getFactsRelatedToTopic(topic, article[id].article.title + "\n" + nlp.nWords(article[id].article.text, 2500));
    if (article[id].facts === false) {
        article[id].status = false;
        return false;
    }

    article[id].quotes = await ai.extractReleventQuotes(topic, nlp.nWords(article[id].article.text, 2500));
    if (article[id].quotes === false) {
        article[id].quotes = {quotes: []};
        return false;
    }

    article[id].status = true;
    return true;
}

const handleUrls = async (socket, info) => {
    const { urls, topic, login } = info;
    const article = {};

    const batchNum = 5;

    let promiseList = [];

    for (let i = 0; i < urls.length; ++i) promiseList.push(processUrl(urls[i], topic, article, i));

    console.log('promiseList', promiseList);
    
    try {
        await Promise.all(promiseList);
    } catch (err) {
        console.error('handleUrls error', err);
        return false;
    }
    
    const ids = Object.keys(article);

    let sourceList = '';

    for (let i = 0; i < ids.length; ++i) {
        if (article[ids[i]].status) {
            sourceList += `Source ID ${ids[i]}:\n\t` + article[ids[i]].facts.facts.join(`\n\t`) + `\n`;
        }
    }

    const maxSourceListWords = 2500;

    sourceList = nlp.nWords(sourceList, maxSourceListWords);

    console.log('sourceList', sourceList);
    
    const initialArticle = await ai.getArticleFromSourceList(topic, sourceList);

    console.log('initial Article', initialArticle);

    let quoteList = `Quotes:\n`;

    for (let i = 0; i < ids.length; ++i) {
        if (article[ids[i]].quotes && article[ids[i]].quotes.quotes.length) {
            console.log('quotes: ', article[ids[i]].quotes.quotes);
            for (let j = 0; j < article[ids[i]].quotes.quotes.length; ++j) {
               if (article[ids[i]].quotes.quotes[j].speaker
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'unknown'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'anonymous'  
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'text'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'n/a'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'na'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'article'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'null'
                && article[ids[i]].quotes.quotes[j].speaker.toLowerCase() !== 'undefined') {
                    const speaker = article[ids[i]].quotes.quotes[j].speaker;
                    let quote = article[ids[i]].quotes.quotes[j].quote.replaceAll("\n", " ");
                    if (!quote.startsWith('"')) quote = '"' + quote + '"';
                    quoteList += `Quote from ${speaker}: ${quote}\n`
                }
            }
        }
    }

    console.log('quoteList', quoteList);

    let quoteInsertedArticle;

    if (quoteList.length < 10) quoteInsertedArticle = initialArticle;
    else quoteInsertedArticle = await ai.insertQuotesFromQuoteList(initialArticle, quoteList);

    const engagingArticlePromise = ai.rewriteArticleInEngagingManner(quoteInsertedArticle);

    const titlesAndTagsPromise = ai.getTagsAndTitles(quoteInsertedArticle);

    let result, engagingArticle, titlesAndTags;

    try {
        result = await Promise.all([engagingArticlePromise, titlesAndTagsPromise]);
        console.log('result', result);
    } catch (err) {
        console.error('handleUrls Error: ', err);
        return false;
    }

    engagingArticle = result[0];
    titlesAndTags = result[1];

    console.log('engaging article', engagingArticle);
    console.log('titles and tags', titlesAndTags);

    const titles = titlesAndTags.titles;
    const tags = titlesAndTags.tags;

    console.log('login', login);
    result = await wp.createPost('delta.pymnts.com', login.username, login.password, titles[0], engagingArticle, tags, titles);

    console.log('WordPress Result', result);
}

io.on('connection', socket => {
    handleSocketConnection(socket);
    //socket.on('sourceUrl', (sourceUrl) => setSourceUrl(socket, sourceUrl));
    socket.on('input', input => handleInput(socket, input));
    socket.on('urls', info => handleUrls(socket, info));

    // client.on('event', data => { console.log(data) });
    // client.on('disconnect', () => { console.log('disconnected', client.id)});
});


httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});


const anotherTest = async () => {
    const test = await wp.createPost('delta.pymnts.com', 'mwood', 'P%DqjXAtjjPTGJ^XwHRVbeql', 'Test Post', 'Test content');
    console.log('test', test);
}

//anotherTest();
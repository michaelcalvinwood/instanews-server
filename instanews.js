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
const serp = require('./utils/scaleSerp');

const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());

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
      //origin: "https://instanews.pymnts.com",
      origin: "http://localhost:3000",
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

    const gistAndTopic = await ai.getTopicAndGist(text);

    if (gistAndTopic === false) return sendMessage('error', 'Could not determine gist and topic of the article.', socket);

    console.log(gistAndTopic);

    const { gist, topic } = gistAndTopic;

    const gistSentences = nlp.sentences(gist);

    console.log(gistSentences);
    
    const topicKeywwordsAndAffiliationsPromise = ai.getConceptsNamesAndAffiliations(topic);
    const gistKeywordsAndAffiliationsPromise = ai.getConceptsNamesAndAffiliations(gistSentences[0]);

    let keywordsAndAffiliations;

    try {
        sendMessage('success', 'Extracting keywords and affiliations from topic and gist.', socket);
        keywordsAndAffiliations = await Promise.all([topicKeywwordsAndAffiliationsPromise, gistKeywordsAndAffiliationsPromise]);
    } catch (err) {
        return sendMessage('error', "Could not get keywords and affiliations from gist and topic.", socket);
    }

    console.log(keywordsAndAffiliations);

    const concepts1 = keywordsAndAffiliations[0].concepts;
    const concepts2 = keywordsAndAffiliations[1].concepts;

    const names1 = keywordsAndAffiliations[0].names;
    const names2 = keywordsAndAffiliations[1].names;

    for (let i = 0; i < names1.length; ++i) names1[i] = '"' + names1[i] + '"';
    for (let i = 0; i < names2.length; ++i) names2[i] = '"' + names2[i] + '"';

    let query1, query2;

    if (names1.length) query1 = names1.join(" ");
    if (names2.length) query2 = names2.join(" ");

    if (concepts1.length) query1 += names1.length ? ' ' + concepts1.join(" ") : concepts1.join(" ");
    if (concepts2.length) query2 += names2.length ? ' ' + concepts2.join(" ") : concepts2.join(" ");
    
    
    sendMessage('success', `Google query: ${query1}`, socket);
    
    const urls1 = await serp.urls(query1);

    console.log(urls1);

    return;



    if (keywordsAndAffiliations === false) return sendMessage('error', 'Could not get keywords and affiliations.', socket);

    keywordsAndAffiliations = keywordsAndAffiliations.replaceAll("\n", "");

    console.log(keywordsAndAffiliations);

    keywordsObj = JSON.parse(keywordsAndAffiliations);
    
    console.log(keywordsObj);

}

io.on('connection', socket => {
    handleSocketConnection(socket);
    socket.on('sourceUrl', (sourceUrl) => setSourceUrl(socket, sourceUrl));

    // client.on('event', data => { console.log(data) });
    // client.on('disconnect', () => { console.log('disconnected', client.id)});
});


httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});



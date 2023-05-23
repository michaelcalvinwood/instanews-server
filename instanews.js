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

    text = nlp.nWords(text, 3250);

    let keywordsAndAffiliations = await ai.getKeywordsAndAffiliations(text);

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



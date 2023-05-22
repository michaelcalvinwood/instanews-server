const listenPort = 6405;
const hostname = 'node.pymnts.com'
const privateKeyPath = `/etc/letsencrypt/live/${hostname}/privkey.pem`;
const fullchainPath = `/etc/letsencrypt/live/${hostname}/fullchain.pem`;

const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');

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

io.on('connection', socket => {
    handleSocketConnection(socket);
    // client.on('connection', (socket) => socketConnection(socket));
    // client.on('event', data => { console.log(data) });
    // client.on('disconnect', () => { console.log('disconnected', client.id)});
});


httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});



const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


const linksRouter = require('./routes/links.router');




app.use('/api/links', linksRouter
);



// Fehlerbehandlung
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Etwas ist schiefgelaufen!');
});

// Server starten
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}....`);
});


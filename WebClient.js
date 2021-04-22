var wsServer = require('ws');
var ws = new wsServer("ws://127.0.0.1:6010");

ws.onmessage = (event) => {
    console.log(event.data);
}
// var Game = require('./game');
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();
const server = http.createServer(app);

var wss = new WebSocket.Server({ server });

function makeGame() {
  return {
    "game_id": "ABCDEFG",
    "moves": [
      {
        "player": "x",
        "x": 0,
        "y": 0
      }
    ]
  }
}

var game = makeGame()

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message : string) {
      var in_data = JSON.parse(message)
      game.moves.push({
        x: in_data.x,
        y: in_data.y,
        player: in_data.player
      })

      var out_data = JSON.stringify(game)
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(out_data);
        }
      });
    });
    ws.send(JSON.stringify(game));
});

//start our server
server.listen(process.env.PORT || 8080, () => {
  if (server != null) {
    var address = server.address();
    if (address != null && typeof(address) != "string") {
      console.log(`Server started on port ${address.port} :)`);
    }
  }
});

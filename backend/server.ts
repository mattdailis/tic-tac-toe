// var Game = require('./game');
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as path from 'path';

const app = express();
const server = http.createServer(app);

var wss = new WebSocket.Server({ server, path: "/ws" });

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

const assetsPath = path.join(__dirname, 'public');

app.get('/', function(req, res) {
  res.sendFile(path.join(assetsPath, 'index.html'))
})

app.get(/^(.+)$/, function(req, res) {
  var target = path.join(assetsPath, req.params[0])
  if (target.length > 1 && target[target.length - 1] == '/') {
    target = target.substring(0, target.length - 1);
  }
  console.log(target)
  res.sendFile(target)
});

//start our server
server.listen(process.env.PORT || 80, () => {
  if (server != null) {
    var address = server.address();
    if (address != null && typeof(address) != "string") {
      console.log(`Server started on port ${address.port} :)`);
    }
  }
});

var app = require('http').createServer(handler),
io = require('socket.io').listen(app),
fs = require('fs');

app.listen(2014);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}


io.sockets.on('connection', function(socket) {
  console.log("Connection Established from some peer.");

  socket.on('sendOfferToPeer', function(offerData) {
    console.log("Received a request to send offer to a peer.");
    socket.emit('sendingOffer', offerData);
  });

  socket.on('sendAnswerToPeer', function(AnswerData) {
    console.log("Received a request to send Answer to the peer.");
    socket.emit('sendingAnswer', AnswerData);
  });

});




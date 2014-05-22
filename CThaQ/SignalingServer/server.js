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

var isStreaming = false;

io.sockets.on('connection', function(socket) {
  console.log("Connection Established from some peer.");
  socket.emit('streamingStatus', isStreaming);

  socket.on('updateStreamingStatus', function(status) {
    isStreaming = status;
    console.log("Streaming status updated to: " + isStreaming);
  });

  socket.on('sendRequestOffer', function(receiverIdentifier) {
    io.sockets.emit('requestOffer', receiverIdentifier);
  });

  socket.on('sendOfferToPeer', function(offerData) {
    console.log("Received a request to send offer to a peer.");
    io.sockets.emit('sendingOffer', offerData);
  });

  socket.on('sendAnswerToPeer', function(AnswerData) {
    console.log("Received a request to send Answer to the peer.");
    io.sockets.emit('sendingAnswer', AnswerData);
  });

  socket.on('hangUpCall', function(data) {
    console.log("Hanging up call.");
    io.sockets.emit('closeCall', data);
  });

});




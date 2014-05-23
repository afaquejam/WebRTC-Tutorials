var socket = io.connect('http://131.160.13.18:2014');

var localStream;
var localPeerConnection;
var remotePeerConnection;
var offerData;
var isReceiver;
var receiverIdentifier;

var constraints = {
  video: true,
  audio: false
};

var videoElement = document.getElementById("videoElement");
var startButton = document.getElementById("startButton");
var stopButton = document.getElementById("stopButton");

startButton.onclick = startStreaming;
stopButton.onclick = stopStreaming;

startButton.disabled = true;
stopButton.disabled = true;

function startStreaming() {
  startButton.disabled = true;
  stopButton.disabled = false;
  getLocalStream();

  socket.emit('updateStreamingStatus', true);
  trace("Started streaming.");
}

function stopStreaming() {
  startButton.disabled = false;
  stopButton.disabled = true;
  socket.emit('updateStreamingStatus', false);
}

socket.on('streamingStatus', function (isStreaming) {
  if (!isStreaming) {
    isReceiver = false;
    startButton.disabled = false;
    trace("I will be streaming.");
  } else {
    isReceiver = true;
    receiverIdentifier = getRandomInt(0, 25000);
    socket.emit('sendRequestOffer', receiverIdentifier);
    trace("I will be receiving." + receiverIdentifier);
  }

});

socket.on('requestOffer', function(data) {
  if(!isReceiver) {
    receiverIdentifier = data;
    call();
  }
});

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotLocalPeerLocalStream(stream){
  trace("Got Local Media Stream.");
  videoElement.src = URL.createObjectURL(stream);
  localStream = stream;
}

function getLocalStream() {
   navigator.webkitGetUserMedia(constraints, gotLocalPeerLocalStream,
     errorCallback);
}

function call() {
  trace("Starting call");

  var servers = null;

  localPeerConnection = new webkitRTCPeerConnection(servers);

  localPeerConnection.addStream(localStream);
  trace("Added localStream to localPeerConnection");

  // createOffer triggers the ICE candidate gathering process at the local side.
  localPeerConnection.createOffer(gotLocalDescription);
  localPeerConnection.onicecandidate = gotLocalIceCandidate;
}

function gotLocalDescription(description){
  // The Generated SDP does not contain ICE candidates.
  localPeerConnection.setLocalDescription(description);
  trace("Local Description Set.");
}

function gotLocalIceCandidate(event) {
  if (event.target.iceGatheringState == "complete") {
    trace("Local ICE candidates gathering complete.");

    // Once the ICE gathering state is completed, create an SDP updated with
    // the ICE candidates.
    localPeerConnection.createOffer(sendOffer);
  }
}

function sendOffer(description) {
  trace("Sending offer to the other peer.");
  socket.emit('sendOfferToPeer', { id: receiverIdentifier,
    data: description });
}

socket.on('sendingOffer', function (offer) {
  if (isReceiver && offer.id == receiverIdentifier) {
    trace('Incoming Call: ' + offer.id);
    offerData = new RTCSessionDescription(offer.data);
    acceptCall();
  }
});

function acceptCall() {
  var servers = null;

  remotePeerConnection = new webkitRTCPeerConnection(servers);
  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

  remotePeerConnection.setRemoteDescription(offerData);
  trace("Remote description of Remote peer set.");

  //Create Answer triggers the ICE gathering process at the remote peer.
  remotePeerConnection.createAnswer(gotRemoteDescription);
}

function gotRemoteDescription(description){
  // The remote peer also sets its local description without the ICE candidates.
  remotePeerConnection.setLocalDescription(description);
  trace("Local description of the remote peer set.");
}

function gotRemoteIceCandidate(event){
  if (event.target.iceGatheringState == "complete") {
    trace("Remote ICE candidates gathering complete.");

    // Once the ICE gathering state is completed, create an SDP updated with
    // the ICE candidates.
    remotePeerConnection.createAnswer(sendAnswer);
  }
}

function sendAnswer(description) {
  trace("Sending Answer to the other peer.");
  socket.emit('sendAnswerToPeer', description);
}

socket.on('sendingAnswer', function (AnswerData) {
  if (!isReceiver) {
    trace("Answer received from receiver.");
    // For some reason, socket.io doesn't preserve the object type.
    AnswerData = new RTCSessionDescription(AnswerData);

    localPeerConnection.setRemoteDescription(AnswerData);
    trace("Remote description of the local peer set.");
  }
});

function gotRemoteStream(event){
  videoElement.src = URL.createObjectURL(event.stream);
  trace("Received remote stream.");
}

socket.on('closeCall', function (data) {
  if (isReceiver) {
    remotePeerConnection.close();
    remotePeerConnection = null;
  } else {
    localPeerConnection.close();
    localPeerConnection = null;
    localStream = null;
    offerData = null;
    isReceiver = null;
    startButton.disabled = false;
  }

  videoElement.src = null;

});

function errorCallback() {
  trace("Failed to get User Media!");
  socket.emit('hangUpCall', null);
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

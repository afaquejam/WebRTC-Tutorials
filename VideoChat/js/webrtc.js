var socket = io.connect('http://localhost:2014');

var localStream;
var localPeerConnection;
var remotePeerConnection;
var offerData;
var isCaller = false;

var constraints = {
  video: true,
  audio: true
};

var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

var callButton = document.getElementById("callButton");
var hangupButton = document.getElementById("hangupButton");
var acceptButton = document.getElementById("acceptCallButton");

hangupButton.disabled = true;
acceptButton.disabled = true;

callButton.onclick = initiate;
hangupButton.onclick = hangup;
acceptButton.onclick = acceptCall;

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotLocalPeerLocalStream(stream){
  trace("Got Local Media Stream.");
  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  callButton.disabled = true;
  hangupButton.disabled = false;
  call();
}


function initiate() {
  navigator.webkitGetUserMedia(constraints, gotLocalPeerLocalStream,
    errorCallback);
}

function call() {
  isCaller = true;
  trace("Starting call");

  var servers = null;

  localPeerConnection = new webkitRTCPeerConnection(servers);

  localPeerConnection.addStream(localStream);
  trace("Added localStream to localPeerConnection");

  // createOffer triggers the ICE candidate gathering process at the local side.
  localPeerConnection.createOffer(gotLocalDescription);
  localPeerConnection.onicecandidate = gotLocalIceCandidate;
  localPeerConnection.onaddstream = gotRemoteStream;
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
  socket.emit('sendOfferToPeer', description);
}

socket.on('sendingOffer', function (offer) {
  if (!isCaller) {
    acceptButton.disabled = false;
    hangupButton.disabled = false;
    callButton.disabled = true;
    trace('Incoming Call.');

    offerData = new RTCSessionDescription(offer);
  }
});

function acceptCall() {
  acceptCallButton.disabled = true;
  var servers = null;

  remotePeerConnection = new webkitRTCPeerConnection(servers);

  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

  remotePeerConnection.setRemoteDescription(offerData);
  trace("Remote description of Remote peer set.");

  navigator.webkitGetUserMedia(constraints, gotRemotePeerLocalStream,
    errorCallback);

}

function gotRemotePeerLocalStream(stream){
  callButton.disabled = true;

  localVideo.src = URL.createObjectURL(stream);
  remotePeerConnection.addStream(stream);

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
  if (isCaller) {
    trace("Answer received from the remote peer.");
    // For some reason, socket.io doesn't preserve the object type.
    AnswerData = new RTCSessionDescription(AnswerData);

    localPeerConnection.setRemoteDescription(AnswerData);
    trace("Remote description of the local peer set.");
  }

});

function gotRemoteStream(event){
  remoteVideo.src = URL.createObjectURL(event.stream);
  trace("Received remote stream.");
}

function hangup() {
  socket.emit('hangUpCall', null);
}

socket.on('closeCall', function (data) {
  if (isCaller) {
    localPeerConnection.close();
    localPeerConnection = null;
    localStream = null;
    offerData = null;
    isCaller = false;
  } else {
    if(remotePeerConnection) {
      remotePeerConnection.close();
      remotePeerConnection = null;
    }
  }

  callButton.disabled = false;
  hangupButton.disabled = true;
  acceptCallButton.disabled = true;

  localVideo.src = null;
  remoteVideo.src = null;

  trace("Call closed.");

});

function errorCallback() {
  console.log("Failed to get User Media!");
  socket.emit('hangUpCall', null);
}


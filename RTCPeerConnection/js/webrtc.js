var localStream;
var localPeerConnection;
var remotePeerConnection;

var constraints = {
  video: true,
  audio: true
};

var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

var startButton = document.getElementById("startButton");
var callButton = document.getElementById("callButton");
var hangupButton = document.getElementById("hangupButton");

startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream){
  trace("Got Local Media Stream.");
  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  callButton.disabled = false;
}

function start() {
  startButton.disabled = true;
  navigator.webkitGetUserMedia(constraints, gotStream, errorCallback);
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace("Starting call");

  var servers = null;

  localPeerConnection = new webkitRTCPeerConnection(servers);

  localPeerConnection.addStream(localStream);
  trace("Added localStream to localPeerConnection");

  // CreateOffer triggers the ICE candidate gathering process at the local side.
  localPeerConnection.createOffer(gotLocalDescription);
  localPeerConnection.onicecandidate = gotLocalIceCandidate;

  remotePeerConnection = new webkitRTCPeerConnection(servers);
  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

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
  // We assume that the SDP is sent over some signalling channel.
  // And then a method gets invoked which contains the following.
  trace("Offer received at the remote peer.");

  remotePeerConnection.setRemoteDescription(description);
  trace("Remote description of Remote peer set.");

  // Create Answer triggers the ICE gathering process at the remote peer.
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
  // We assume that the SDP is sent over some signalling channel.
  // And then a method gets invoked locally which contains the following.
  trace("Answer received from the remote peer.");

  localPeerConnection.setRemoteDescription(description);
  trace("Remote description of the local peer set.");
}

function gotRemoteStream(event){
  remoteVideo.src = URL.createObjectURL(event.stream);
  trace("Received remote stream.");
}

function hangup() {
  trace("Ending call");
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function errorCallback() {
  console.log("Failed to get User Media!");
}
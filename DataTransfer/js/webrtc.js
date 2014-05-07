var socket = io.connect('http://localhost:2014');

var sendChannel;
var receiveChannel;
var isInitiater = false;
var servers = null;

var startButton = document.getElementById("startButton");
var sendButton = document.getElementById("sendButton");
var stopButton = document.getElementById("stopButton");

startButton.disabled = false;
sendButton.disabled = true;
stopButton.disabled = true;

startButton.onclick = createConnection;
sendButton.onclick = sendData;
stopButton.onclick = closeDataChannels;

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function createConnection() {
  isInitiater = true;

  window.localPeerConnection = new webkitRTCPeerConnection(servers,
    {optional: [{RtpDataChannels: true}]});
  trace('Created local peer connection object localPeerConnection');

  try {
    // Reliable Data Channels not yet supported in Chrome
    sendChannel = localPeerConnection.createDataChannel("sendDataChannel",
      {reliable: false});
    trace('Created send data channel');
  } catch (e) {
    alert('Failed to create data channel. ' +
          'You need Chrome M25 or later with RtpDataChannel enabled');
    trace('createDataChannel() failed with exception: ' + e.message);
  }

  // Create a Local description. This will trigger generation of ICE candidates.
  localPeerConnection.createOffer(gotLocalDescription);

  localPeerConnection.onicecandidate = gotLocalIceCandidate;

  sendChannel.onopen = handleSendChannelStateChange;
  sendChannel.onclose = handleSendChannelStateChange;

  startButton.disabled = true;
  stopButton.disabled = false;
}

function gotLocalDescription(description) {
  // The Generated SDP does not contain ICE candidates.
  localPeerConnection.setLocalDescription(description);
  trace("Local Description set.");
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
  if (!isInitiater) {
    trace("Offer received at the remote peer.");

    startButton.disabled = true;
    sendButton.disabled = false;
    stopButton.disabled = false;

    window.remotePeerConnection = new webkitRTCPeerConnection(servers,
      {optional: [{RtpDataChannels: true}]});
    trace('Created remote peer connection object remotePeerConnection');

    remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
    remotePeerConnection.ondatachannel = gotReceiveChannel;

    offer = new RTCSessionDescription(offer);
    remotePeerConnection.setRemoteDescription(offer);
    trace("Remote description of Remote peer set.");

    remotePeerConnection.createAnswer(gotRemoteDescription);

  }
});

function gotRemoteDescription(description){
  // The remote peer also sets its local description without the ICE candidates.
  remotePeerConnection.setLocalDescription(description);
  trace("Local description of the remote peer set.");
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleReceiveChannelStateChange;
  receiveChannel.onclose = handleReceiveChannelStateChange;
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
  if (isInitiater) {
    trace("Answer received from the remote peer.");

    AnswerData = new RTCSessionDescription(AnswerData);

    localPeerConnection.setRemoteDescription(AnswerData);
    trace("Remote description of the local peer set.");
  }

});

function sendData() {
  var data = document.getElementById("sendText").value;
  sendChannel.send(data);
  trace('Sent data: ' + data);
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
  document.getElementById("receiveText").value = event.data;
}

function handleSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState == "open") {
    sendText.disabled = false;
    sendText.focus();
    sendText.placeholder = "";
    sendButton.disabled = false;
    stopButton.disabled = false;
  } else {
    sendText.disabled = true;
    sendButton.disabled = true;
    stopButton.disabled = true;
  }
}

function handleReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  trace('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  stopButton.disabled = true;
  sendText.value = "";
  receiveText.value = "";
  sendText.disabled = true;
  sendText.placeholder = "Press Start, enter some text, then press Send.";
}

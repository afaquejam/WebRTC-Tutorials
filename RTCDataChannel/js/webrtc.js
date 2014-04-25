var sendChannel;
var receiveChannel;

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
  var servers = null;

  // Looks like chrome uses RTPDataChannels to send data, instead of SCTP.
  // RTPDataChannels will be soon depricated.
  // I still do not know why they are using window.localPeerConnection?
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

  window.remotePeerConnection = new webkitRTCPeerConnection(servers,
    {optional: [{RtpDataChannels: true}]});
  trace('Created remote peer connection object remotePeerConnection');

  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.ondatachannel = gotReceiveChannel;

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
  // We assume that the SDP is sent over some signalling channel.
  // And then a method gets invoked locally which contains the following.
  trace("Answer received from the remote peer.");

  localPeerConnection.setRemoteDescription(description);
  trace("Remote description of the local peer set.");
}

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

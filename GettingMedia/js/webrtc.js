var constraints = {
  video: {
    mandatory: {
      minWidth: 1080,
      minHeight: 720
    }
  },
  audio: true
};

function successCallback(mediaStream) {
  console.log("Got User Media");
  console.log(mediaStream);
  var video = document.getElementById("selfView");
  video.src = window.URL.createObjectURL(mediaStream);
}

function errorCallback() {
  console.log("Failed to get User Media");
}

navigator.webkitGetUserMedia(constraints, successCallback, errorCallback);
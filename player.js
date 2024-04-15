// Function to convert a hexadecimal string into an array of bytes
let fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

// Initialization of initial data from a specific hexadecimal string
let initData = fromHexString('000000447073736800000000edef8ba979d64acea3c827dcd51d21ed0000002408011201311a0d7769646576696e655f74657374220a323031355f74656172732a025344')

let licenseServerUrl = 'https://proxy.staging.widevine.com/proxy'


// Configuration of the key system
let config = [{
  initDataTypes: ['cenc'],
  sessionTypes: ['persistent-license'],
  videoCapabilities: [{
    contentType: 'video/mp4; codecs="avc1.640029"'
  }],
  audioCapabilities: [{
    contentType: 'audio/mp4; codecs="mp4a.40.2"'
  }]
}];

// Function to create media keys from key system access
function createMediaKeys(keySystemAccess) {
  let promise = keySystemAccess.createMediaKeys();
  promise.catch(
    function(error) {
      console.error("Unable to create MediaKeys: " + error);
    }
  );
  promise.then(
    function(mediaKeys) {
      onCreate(mediaKeys);
    }
  )
}

// Initialization of the EME (Encrypted Media Extensions) system
function initEME() {
  let promise = navigator.requestMediaKeySystemAccess('com.widevine.alpha', config).catch(
    function(error) {
      console.error("Error while initializing media key system: " + error);
      // If an error occurs, try with a temporary session
      config[0]['sessionTypes'] = ['temporary']
      navigator.requestMediaKeySystemAccess('com.widevine.alpha', config).then(
        function(keySystemAccess) {
          createMediaKeys(keySystemAccess);
        }
      )
    }
  );
  promise.then(
    function(keySystemAccess) {
      createMediaKeys(keySystemAccess);    
    });
};

// Function called when media keys are successfully created
async function onCreate(mediaKeys) {
  // Creating a media key session
  let keySession = mediaKeys.createSession(config[0]['sessionTypes'])
  if (keySession == null) {
    console.error("Unable to create MediaSession")
  } else {
    console.log("MediaSession created with type: " + config[0]['sessionTypes'])
  }
  try {
    // Adding an event listener for the media key session message
    keySession.addEventListener("message", handleMessage, false);
  } catch (err) {
    console.error("Unable to add 'message' event listener to the keySession object. Error: " + err.message);
  }
  // Generating the license request
  keySession.generateRequest("cenc", initData)
}

// Execution when the window is fully loaded
window.onload = function() {
  
  // Retrieving the video element
  let videoPlayer = document.getElementById('videoPlayer');

  /** @type {?shaka.Player} */
  let player = new shaka.Player(videoPlayer);

  player.configure({
    drm: {
      servers: {
          'com.widevine.alpha': licenseServerUrl
      }
    },
    abr: {
      enabled: false,
      defaultBandwidthEstimate: 1,
      // Forces play at lowest resolution.
      switchInterval: 1
    }
  });

  let mpdUrl = 'https://storage.googleapis.com/wvmedia/cenc/h264/llama/llama.mpd';

  // Adding an event listener for click on the video
  videoPlayer.addEventListener('click', function() {

    // Playing or pausing the video depending on the current state
    if (videoPlayer.paused) {
      videoPlayer.play();
      // Initializing the EME system on click
      initEME();

      player.load(mpdUrl).then(() => {
        console.log('La MPD a été chargée avec succès.');
      }).catch((error) => {
        console.error('Erreur lors du chargement de la MPD :', error);
      });
    } else {
      videoPlayer.pause();
    }
  });
};

// Event handler for the media key session message
function handleMessage(event) {
  var keySession = event.target;
  var te = new TextEncoder();
  // Encoding the license request into JSON
  var license = te.encode('{"keys":[{"kty":"oct","k":"tQ0bJVWb6b0KPL6KtZIy_A","kid":"LwVHf8JLtPrv2GUXFW2v_A"}],"type":"temporary"}');
  // Updating the license in the media key session
  keySession.update(license).catch(
    console.error.bind(console, 'update() failed')
  );
}

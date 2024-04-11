// Configuration du système de clés
let config = [{
    initDataTypes: ['cenc'],
    sessionTypes: ['persistent-license'],
    videoCapabilities: [{
      contentType: 'video/mp4; codecs="avc1.640029"'
    }],
    audioCapabilities: [{
      contentType: 'audio/mp4; codecs="mp4a.40.2"'
    }]
  }
];
	
function createMediaKeys(keySystemAccess) {
  let promise = keySystemAccess.createMediaKeys();
  promise.catch(
    function(error) {
      console.error("Unable to create MediaKeys : " + error);
    }
  );
  promise.then(
    function(mediaKeys) {
      onCreate(mediaKeys);
    }
  )
}
	
window.onload = function() {
  let promise = navigator.requestMediaKeySystemAccess('com.widevine.alpha', config).catch(
    function(error) {
      console.error("Error while initializing media key system: " + error);
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

async function onCreate(mediaKeys) {
  let keySession = mediaKeys.createSession(config[0]['sessionTypes'])
  if (keySession == null) {
    console.error("Unable to create MediaSession")
  } else {
    console.log("MediaSession created with type: " + config[0]['sessionTypes'])
  }
  try {
    keySession.addEventListener("message", handleMessage, false);
  } catch (err) {
    console.error("Unable to add 'message' " +
      "event listener to the keySession object. Error: " + err.message);
  }
  // Generate license request
  keySession.generateRequest("cenc", initData)
}

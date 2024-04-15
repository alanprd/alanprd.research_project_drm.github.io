// Configuration du système de clés

let initData = fromHexString('000000447073736800000000edef8ba979d64acea3c827dcd51d21ed0000002408011201311a0d7769646576696e655f74657374220a323031355f74656172732a025344')

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

function initEME() {
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

window.onload = function() {
  let videoPlayer = document.getElementById('videoPlayer');
  videoPlayer.addEventListener('click', function() {
    if (videoPlayer.paused) {
      videoPlayer.play();
      initEME();
    } else {
      videoPlayer.pause();
    }
  });
};

function handleMessage(event) {
  var keySession = event.target;
  var te = new TextEncoder();
  var license = te.encode('{"keys":[{"kty":"oct","k":"tQ0bJVWb6b0KPL6KtZIy_A","kid":"LwVHf8JLtPrv2GUXFW2v_A"}],"type":"temporary"}');
  keySession.update(license).catch(
    console.error.bind(console, 'update() failed')
  );
}



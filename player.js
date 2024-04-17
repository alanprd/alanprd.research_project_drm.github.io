// converts a hexadecimal string into a Uint8Array.
let fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

// URL of the MPD file

let certOrigin = 'license.widevine.com' // is the origin of the service certificate.
let serverCert = fromHexString('080512C7050AC102080312101705B917CC1204868B06333A2F772A8C1882B4829205228E023082010A028201010099ED5B3B327DAB5E24EFC3B62A95B598520AD5BCCB37503E0645B814D876B8DF40510441AD8CE3ADB11BB88C4E725A5E4A9E0795291D58584023A7E1AF0E38A91279393008610B6F158C878C7E21BFFBFEEA77E1019E1E5781E8A45F46263D14E60E8058A8607ADCE04FAC8457B137A8D67CCDEB33705D983A21FB4EECBD4A10CA47490CA47EAA5D438218DDBAF1CADE3392F13D6FFB6442FD31E1BF40B0C604D1C4BA4C9520A4BF97EEBD60929AFCEEF55BBAF564E2D0E76CD7C55C73A082B996120B8359EDCE24707082680D6F67C6D82C4AC5F3134490A74EEC37AF4B2F010C59E82843E2582F0B6B9F5DB0FC5E6EDF64FBD308B4711BCF1250019C9F5A0902030100013A146C6963656E73652E7769646576696E652E636F6D128003AE347314B5A835297F271388FB7BB8CB5277D249823CDDD1DA30B93339511EB3CCBDEA04B944B927C121346EFDBDEAC9D413917E6EC176A10438460A503BC1952B9BA4E4CE0FC4BFC20A9808AAAF4BFCD19C1DCFCDF574CCAC28D1B410416CF9DE8804301CBDB334CAFCD0D40978423A642E54613DF0AFCF96CA4A9249D855E42B3A703EF1767F6A9BD36D6BF82BE76BBF0CBA4FDE59D2ABCC76FEB64247B85C431FBCA52266B619FC36979543FCA9CBBDBBFAFA0E1A55E755A3C7BCE655F9646F582AB9CF70AA08B979F867F63A0B2B7FDB362C5BC4ECD555D85BCAA9C593C383C857D49DAAB77E40B7851DDFD24998808E35B258E75D78EAC0CA16F7047304C20D93EDE4E8FF1C6F17E6243E3F3DA8FC1709870EC45FBA823A263F0CEFA1F7093B1909928326333705043A29BDA6F9B4342CC8DF543CB1A1182F7C5FFF33F10490FACA5B25360B76015E9C5A06AB8EE02F00D2E8D5986104AACC4DD475FD96EE9CE4E326F21B83C7058577B38732CDDABC6A6BED13FB0D49D38A45EB87A5F4') 
// License Server URL
let licenseServerUrl = 'https://proxy.staging.widevine.com/proxy'
// inline policy for renewable licenses  with persistence allowed
let inline_policy_renew = '?policy=CAEQARgBKAAwADgFSAFQBWAB'
let initData;
let keyId;

// Function to convert from base64 to Uint8Array
function base64ToUint8Array(base64) {
  let binaryString = window.atob(base64);
  let len = binaryString.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}



// Configuration of the key system
let config = [{
  initDataTypes: ['cenc'],
  sessionTypes: ['persistent-license'],
  videoCapabilities: [{
    contentType: 'video/mp4; codecs="avc1.640028"'
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

   // Set the media keys on the video player
   videoPlayer.setMediaKeys(mediaKeys).catch(error => {
    console.error('Failed to set media keys:', error);
  });

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

    /*// Add the encrypted event listener
    videoPlayer.addEventListener('encrypted', function(event) {
      handleEncrypted(event, keySession);
    }, false);*/



 
}

/*function handleEncrypted(event, keySession) {
  // Generating the license request
  keySession.generateRequest(event.initDataType, event.initData).catch(error => {
    console.error('Failed to generate license request:', error);
  });}*/


// Event handler for the media key session message
function handleMessage(event) {
  let keySession = event.target;
  console.log('Receiving '+ event.messageType + ' from CDM')
  console.log("SessionID: " + keySession.sessionId)
  console.log("Message:\n" + hexdump(event.message, 16))

  //Check if size equals the service certificate challenge
  if (event.message.byteLength == 2) {
    console.warn('Need a Service Certificate: using cert of ' + certOrigin)
    keySession.update(serverCert).catch(
          function (error) {
              console.error('Failed to update the session', error);
          }
      );
  } else {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) { 
        // log the license response and update the CDM session with content key(s)
        utf8resp = new Uint8Array(xhr.response)
        console.log(hexdump(utf8resp, 16))

        let promise = keySession.update(utf8resp).catch(
          function(error) {
            console.error("error update: " + error);
          }
        );
    
      }
    }
 
    // sending request to license server with inline policy renew
    let url = licenseServerUrl + inline_policy_renew
    console.log("Sending request to: " + url)
    xhr.open("POST", url, true);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(event.message);
  }
}

function handleEncrypted(event) {
  onCreate()
  var session = videoElement.mediaKeys.createSession();

  session.generateRequest(event.initDataType, event.initData);
}

// Execution when the window is fully loaded
window.onload = function() {
  


// Create a dash.js player object
let videoPlayer = new MediaPlayer(context);
videoPlayer.startup();

// The video element on your page
videoPlayer.attachView(document.querySelector("#videoPlayer"));

// Load the MPD file (assuming you have the URL)
videoPlayer.attachSource('./video.mpd');

// Handle errors during MPD loading
videoPlayer.on(Dash.MediaPlayer.Events.ERROR, function(error) {
  console.error("Error loading MPD:", error);
});

// Function to handle encrypted segments (triggered by dash.js 'encrypted' event)
function handleEncrypted(event) {
  let keySession = videoPlayer.keySystemAccess.createSession();
  keySession.generateRequest(event.initDataType, event.initData).catch(error => {
    console.error('Failed to generate license request:', error);
  });
}

// Event listener for encrypted segments
videoPlayer.on(Dash.MediaPlayer.Events.ENCRYPTED, handleEncrypted);

// Initializing the EME system on click
initEME();
  

  // Adding an event listener for click on the video
  videoPlayer.addEventListener('click', function() {
    // Playing or pausing the video depending on the current state
    if (videoPlayer.paused) {
      
      videoPlayer.play();

    
    } else {
      videoPlayer.pause();
    }
  });
};


document.addEventListener("DOMContentLoaded", function() {
    var videoElement = document.getElementById('videoPlayer');
    if (typeof videoElement.mediaKeys === 'undefined' ||
        typeof window.MediaKeys === 'undefined' ||
        typeof window.MediaKeySession === 'undefined') {
        console.error('EME API not supported');
        return;
    }

    // URL de la vidéo chiffrée
    var videoUrl = 'output.mp4';
    
    // Créer une session de licence
    var keySession = null;
    // Configuration du système de clés
    var keySystemConfig = {
        'com.widevine.alpha': {
            videoCapabilities: [{
                contentType: 'video/mp4; codecs="avc1.42E01E"'
            }]
        }
    };

    // Demande d'accès au système de clés média
    navigator.requestMediaKeySystemAccess('com.widevine.alpha', [keySystemConfig['com.widevine.alpha']]).then(function(mediaKeySystemAccess) {
        return mediaKeySystemAccess.createMediaKeys();
    }).then(function(mediaKeys) {
        return videoElement.setMediaKeys(mediaKeys);
    }).then(function() {
        // Charger la vidéo chiffrée
        return fetch(videoUrl);
    }).then(function(response) {
        return response.arrayBuffer();
    }).then(function(videoData) {
        // Créer une session de licence
        return videoElement.mediaKeys.createSession();
    }).then(function(session) {
        keySession = session;
        keySession.generateRequest('com.widevine.alpha', new Uint8Array([0])).then(function() {
            console.log('License request generated');
        });
    }).catch(function(error) {
        console.error('Failed to set up MediaKeys', error);
    });
});


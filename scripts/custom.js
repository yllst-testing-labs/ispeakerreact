var event_type = 'click';
var audio_record = false;
var _device = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    event_type = 'touchend';
    _device = true;
}
var deviceIdentity;
//alert(window.parent.deviceflag);
//alert(window.localStorage.getItem('deviceflag'));
//alert(window.localStorage.deviceflag);

if (getMobileOperatingSystem() == "iOS") {
    if (localStorage.getItem("isDevice") == "true") {
        $.getScript("scripts/cordova.js", function (data, textStatus, jqxhr) {
            //alert('cordova.js loaded');
        });
        $.getScript("scripts/howler.min.js", function (data, textStatus, jqxhr) {
            //alert('cordova.js android loaded');
        });
    }
} else if (getMobileOperatingSystem() == "Android") {
    //alert(window.parent.vari);
    
    if (localStorage.getItem("isDevice") == "true") {
        $.getScript("scripts/cordova_android.js", function (data, textStatus, jqxhr) {
            //alert('cordova.js android loaded');
        });
        //$.getScript("scripts/AudioPlayer.js", function (data, textStatus, jqxhr) {
        //    //alert('cordova.js android loaded');
        //});
        
    }
    
}

function getMobileOperatingSystem() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) {
        return 'iOS';

    }
    else if (userAgent.match(/Android/i)) {

        return 'Android';
    }
    else {
        return 'unknown';
    }
}

function scroll_top() {
    var scroll_pos = $('.middle_wrap').position();
    $(window).scrollTop(scroll_pos.top);
}

var recording_path = '/';

function __log(e, data) {
    //log.innerHTML += "\n" + e + " " + (data || '');
    console.log("\n" + e + " " + (data || ''));
}

var audio_context;
var recorder;
var localStream; // line added by MITR

function startUserMedia(stream) {
    var input = audio_context.createMediaStreamSource(stream);
    __log('Media stream created.');

    //input.connect(audio_context.destination);
    __log('Input connected to audio context destination.');

    recorder = new Recorder(input);
    __log('Recorder initialised.');
}

function startRecording(button) {
    recorder && recorder.record();
    //button.disabled = true;
    //button.nextElementSibling.disabled = false;
    __log('Recording...');
}

function stopRecording(button) {
    recorder && recorder.stop();
    //button.disabled = true;
    //button.previousElementSibling.disabled = false;
    __log('Stopped recording.');

    // create WAV download link using audio data blob
    createDownloadLink();
    recorder.clear();
}

function createDownloadLink() {

    recorder && recorder.exportWAV(function(blob) {
        console.log(blob);
        var url = URL.createObjectURL(blob);
        var li = document.createElement('li');
        var au = document.createElement('audio');
        var hf = document.createElement('a');

        au.controls = true;
        au.src = url;
        hf.href = url;
        hf.download = new Date().toISOString() + '.wav';
        hf.innerHTML = hf.download;
        li.appendChild(au);
        li.appendChild(hf);
        recordingslist.appendChild(li);
    });
}

/*window.onload = function init() {
    try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        window.URL = window.URL || window.webkitURL;

        audio_context = new AudioContext;
        __log('Audio context set up.');
        __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
    } catch (e) {
        alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
        __log('No live audio input: ' + e);
    });
};*/

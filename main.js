var scene, renderer;
var camera, tvset;

var cameraRTT, sceneRTT;


$(document).ready(function(){
  if (!init()) animate();
})


// init the scene

function init() {

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        // to get smoother output
        preserveDrawingBuffer: true // to allow screenshot
    });
    renderer.setClearColorHex(0x000000, 1);
    renderer.autoClear = false
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);


    // create a scene
    scene = new THREE.Scene();

    // put a camera in the scene
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 1, 6);
    scene.add(camera);


    // here you add your objects
    // - you will most likely replace this part by your own
    var light = new THREE.AmbientLight(0x444444);
    scene.add(light);

    var light = new THREE.DirectionalLight(0xff8000, 1.5);
    light.position.set(1, 0, 1).normalize();
    scene.add(light);

    var light = new THREE.DirectionalLight(0xff8000, 1.5);
    light.position.set(-1, 1, 0).normalize();
    scene.add(light);

    video = document.createElement('video');
    video.width = 320;
    video.height = 240;
    video.autoplay = true;
    video.loop = true;

    var hasGetUserMedia = !! (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

    console.log("UserMedia is detected", hasGetUserMedia);

    //  Grab the webcam stream in the "standard" HTML5 way.
    if (navigator.getUserMedia) {
        navigator.getUserMedia({
            video: true
        }, function(stream) {
            video.src = stream
        }, cameraError)
        videoTexture = new THREE.Texture(video);
    }
    // for Firefox
    else if (navigator.mozGetUserMedia) {
        navigator.mozGetUserMedia({
            video: true
        }, function(stream) {
            if (window.URL) {
              video.src = window.URL.createObjectURL(stream);
            } else {  // Opera
              video.src = stream;
            }

            video.onerror = function(e){
              stream.stop();
            };
            stream.onended = cameraError;
        }, cameraError)
        videoTexture = new THREE.Texture(video);
    }
    //  If that didn't work out let's at least give the WebKit-specific
    //  commands a whirl. Good for Chrome and Safari.
    else if (navigator.webkitGetUserMedia) {
        navigator.webkitGetUserMedia({
            video: true
        }, function(stream) {
            video.src = window.webkitURL.createObjectURL(stream)
        }, cameraError)
        videoTexture = new THREE.Texture(video);
    }

    //  Otherwise we're provide an error message
    else {
        $('#allow').hide(500)
        $('#error').fadeIn(500)
        console.log('ERROR. This browser does not support WebRTC camera video.')
        camera.src = 'some_fallback_video.webm' // You may want to have a fallback video file here.
        videoTexture = new THREE.Texture(buildGetWebrtcCanvas());
        videoTexture.needsUpdate = true;
    }

    //declare shader
    var sobelShader = {
        uniforms: {
            'texture': {
                type: 't',
                value: videoTexture
            },
             'width': {
                type: 'f',
                value: 320.0
            },
             'height': {
                type: 'f',
                value: 240.0
            }
        },
        vertexShader: [
            'varying vec2 vUv;',
            'void main() {',
               'vUv = uv;',
               'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            '}'
            ].join('\n'),
        fragmentShader: [
            'uniform sampler2D texture;',
            'uniform float width;',
            'uniform float height;',
            'varying vec2 vUv;',
            'void main(void) {',
                'float w = 1.0/width;',
                'float h = 1.0/height;',
                'vec2 texCoord = vUv;',
                'vec4 n[9];',
                'n[0] = texture2D(texture, texCoord + vec2( -w, -h));',
                'n[1] = texture2D(texture, texCoord + vec2(0.0, -h));',
                'n[2] = texture2D(texture, texCoord + vec2(  w, -h));',
                'n[3] = texture2D(texture, texCoord + vec2( -w, 0.0));',
                'n[4] = texture2D(texture, texCoord);',
                'n[5] = texture2D(texture, texCoord + vec2(  w, 0.0));',
                'n[6] = texture2D(texture, texCoord + vec2( -w, h));',
                'n[7] = texture2D(texture, texCoord + vec2(0.0, h));',
                'n[8] = texture2D(texture, texCoord + vec2(  w, h));',
                'vec4 sobel_horizEdge = n[2] + (2.0*n[5]) + n[8] - (n[0] + (2.0*n[3]) + n[6]);',
                'vec4 sobel_vertEdge  = n[0] + (2.0*n[1]) + n[2] - (n[6] + (2.0*n[7]) + n[8]);',
                'vec3 sobel = sqrt((sobel_horizEdge.rgb * sobel_horizEdge.rgb) + (sobel_vertEdge.rgb * sobel_vertEdge.rgb));',
                'gl_FragColor = vec4( sobel, 1.0 );',
            '}'
            ].join('\n')
    }


    //create 3d object and apply video texture to it
    var videoMesh = new THREE.Object3D();
    scene.add(videoMesh);

    var geom = new THREE.PlaneGeometry(1, 1);

    var shader = sobelShader;

    material = new THREE.ShaderMaterial({
        uniforms: shader.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    });

    var mesh = new THREE.Mesh(geom, material);
    mesh.scale.set(2.1, 1.6, 1);
    mesh.position.y = 1.55;
    videoMesh.add(mesh)

}


function buildGetWebrtcCanvas() {
    var canvasW = 256;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = canvasW;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = "rgba(255, 128, 128, 1)";
    ctx.font = "32px Arial";

    ctx.save()
    var text = "No WebRTC";
    var fontH = 32;
    var len = ctx.measureText(text);
    ctx.translate((canvas.width - len.width) / 2, 0);
    ctx.fillText(text, 0, fontH * 2.5);
    ctx.restore();

    ctx.save()
    var text = "Available";
    var fontH = 32;
    var len = ctx.measureText(text);
    ctx.translate((canvas.width - len.width) / 2, 0);
    ctx.fillText(text, 0, fontH * 3.5);
    ctx.restore();

    ctx.fillStyle = "rgba(128, 255, 128, 1)";
    ctx.font = "20px Arial";

    ctx.save()
    var text = "see top of the page";
    var fontH = 32;
    var len = ctx.measureText(text);
    ctx.translate((canvas.width - len.width) / 2, 0);
    ctx.fillText(text, 0, fontH * 5);
    ctx.restore();

    ctx.save()
    var text = "'run WebRTC demos'";
    var fontH = 32;
    var len = ctx.measureText(text);
    ctx.translate((canvas.width - len.width) / 2, 0);
    ctx.fillText(text, 0, fontH * 6);
    ctx.restore();

    return canvas;
}

// animation loop

function animate() {
    // loop on request animation loop
    // - it has to be at the begining of the function
    // - see details at http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    requestAnimationFrame(animate);

    // do the render
    render();

}

// render the scene

function render() {

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        videoTexture.needsUpdate = true;
    }

    // actually render the scene
    renderer.clear();
    renderer.render(scene, camera);
}

function cameraError(event) {

    console.log('ERROR. The camera returned code ' + event + '.')
}

//resize method
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

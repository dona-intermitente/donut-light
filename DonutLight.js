import * as THREE from './three.js-master/build/three.module.js';

import { OrbitControls } from './three.js-master/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from './three.js-master/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './three.js-master/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from './three.js-master/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from './three.js-master/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from './three.js-master/examples/jsm/loaders/GLTFLoader.js';

const BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const darkMaterial = new THREE.MeshBasicMaterial({ opacity: 0, transparent: true });
const materials = {};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x030005 );

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 200);
camera.position.z = -3;

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.5;
controls.minDistance = 2;
controls.maxDistance = 5;

scene.add(new THREE.AmbientLight(0x404040));

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 5;
bloomPass.radius = 0;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        defines: {}
    }), "baseTexture"
);

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(finalPass);

new GLTFLoader().load('donut.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);
    model.children.forEach(e => {
        e.layers.enable(BLOOM_SCENE);
    });
});

const geometry2 = new THREE.PlaneGeometry(6, 6, 6);
const material2 = new THREE.MeshPhysicalMaterial({ color: 0x220E34 });
const plane = new THREE.Mesh(geometry2, material2);
plane.rotateX(-1.6);
plane.position.y = -2;
scene.add(plane);

render();

function render() {
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();
    requestAnimationFrame(render);
	controls.update();
}

function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
    }
}

window.onresize = function () {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );

    bloomComposer.setSize( width, height );
    finalComposer.setSize( width, height );

    render();
};
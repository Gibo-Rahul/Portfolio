import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// --- 1. Variables & Scene Setup ---
let isZoomed = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
mainCamera.position.set(5, 5, 5);

// --- EASY RESIZE CONFIGURATION ---
const portfolioConfig = {
    width: "1150px",  
    height: "650px", 
    pdfPath: "/portfolio.pdf#toolbar=0&navpanes=0" 
};

// --- UI Elements ---
const infoWindow = document.getElementById('info-window');
const infoTitle = document.getElementById('info-title');
const infoText = document.getElementById('info-text');
const portfolioOverlay = document.getElementById('portfolio-overlay');
const clickShield = document.getElementById('click-shield');

// --- EDITABLE DESCRIPTIONS & LOCATIONS ---
const objectDescriptions = {
    "Katana": { text: "A traditional Japanese sword, a symbol of precision and discipline.", pos: { top: "50%", left: "50px", right: "auto", bottom: "auto" } },
    "Mask": { text: "An ornamental mask representing traditional folklore.", pos: { top: "auto", right: "auto", left: "60px", bottom: "40px" } },
    "Danto": { text: "A short blade designed for close-quarters agility.", pos: { bottom: "100px", left: "auto", top: "auto", right: "50px" } },
    "Kunai": { text: "Versatile ninja tool used for climbing and defense.", pos: { top: "30%", right: "auto", left: "50px", bottom: "auto" } },
    "Banner": { text: "A decorative wall scroll displaying unique calligraphy.", pos: { top: "15%", left: "50px", right: "auto", bottom: "auto" } },
    "Tamil": { text: "A tribute to the ancient and classical Tamil language.", pos: { bottom: "150px", right: "80px", top: "auto", left: "auto" } },
    "Idly": { text: "Just Idly.", pos: { top: "20%", right: "50px", left: "auto", bottom: "auto" } },
    "Sai": { text: "A traditional piercing melee weapon used in martial arts.", pos: { top: "60%", left: "80px", right: "auto", bottom: "auto" } },
    "Shuriken": { text: "A weapon used for long-range tactics.", pos: { top: "20%", left: "auto", right: "50px", bottom: "auto" } }
};

// --- AUDIO SETUP ---
const listener = new THREE.AudioListener();
mainCamera.add(listener);
const whooshSound = new THREE.Audio(listener);
new THREE.AudioLoader().load('/sounds/whoosh.mp3', (buffer) => {
    whooshSound.setBuffer(buffer);
    whooshSound.setVolume(0.5);
});

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(mainCamera, renderer.domElement);
// --- LIMIT FREE CAMERA MOVEMENT ---
controls.minPolarAngle = Math.PI / 4; 
controls.maxPolarAngle = Math.PI / 2; 
controls.minAzimuthAngle = -Math.PI / 3; 
controls.maxAzimuthAngle = Math.PI / 3;  
controls.enableDamping = true;

// --- 2. Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- 3. Load Model ---
const loader = new GLTFLoader();
const modelCameras = {};

loader.load('/New_model.glb', (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => {
        if (child.isCamera) {
            modelCameras[child.name] = child;
            child.updateMatrixWorld(true);
            console.log("Blender Camera Found:", child.name);
        }
    });
});

// --- 4. Interaction Logic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactiveObjects = ["Monitor", "Katana", "Star", "Danto", "Mask", "Kunai", "Banner", "Tamil", "Idly", "Sai"];

// --- FIXED CAMERA MAPPING ---
const objectToCameraMap = { 
    "Monitor_2": "MonitorCamera", 
    "Katana_1": "KatanaCamera",
    "Katana_2": "KatanaCamera",
    "Ninja_star3": "StarCamera", 
    "Ninja_star2": "StarCamera", 
    "Mask": "MaskCamera", 
    "Kunai1_1": "KunaiCamera1", 
    "Kunai2_3": "SaiCamera2",
    "Banner_1": "BannerCamera", 
    "Danto_1": "DantoCamera",
    "Danto_2": "DantoCamera",
    "Tamil": "TamilCamera", 
    "Sai_2": "SaiCamera1", 
    "Idly": "IdlyCamera" 
};

window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, mainCamera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedObj = intersects[0].object;
        const clickedName = clickedObj.name;
        console.log(`Clicked: ${clickedName} | Camera At: x:${mainCamera.position.x.toFixed(2)}, y:${mainCamera.position.y.toFixed(2)}, z:${mainCamera.position.z.toFixed(2)}`);

        const isInteractive = interactiveObjects.some(name => clickedName.toLowerCase().includes(name.toLowerCase()));
        if (isInteractive) {
            switchToModelCamera(clickedName, clickedObj);
        } else if (isZoomed) resetCamera();
    } else if (isZoomed) resetCamera();
});

clickShield.addEventListener('click', () => { if (isZoomed) resetCamera(); });

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, mainCamera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const hoverName = intersects[0].object.name;
        if (interactiveObjects.some(name => hoverName.toLowerCase().includes(name.toLowerCase()))) {
            document.body.style.cursor = 'help';
            return;
        }
    }
    document.body.style.cursor = 'crosshair';
});

// --- 5. POV & CAMERA SWITCHING ---

function showInfo(name) {
    if (name.toLowerCase().includes("monitor")) {
        portfolioOverlay.style.width = portfolioConfig.width;
        portfolioOverlay.style.height = portfolioConfig.height;
        portfolioOverlay.src = portfolioConfig.pdfPath;
        clickShield.style.display = 'block';
        portfolioOverlay.style.display = 'block';
        gsap.fromTo(portfolioOverlay, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 0.8, duration: 0.8 });
        return;
    }

    const key = Object.keys(objectDescriptions).find(k => name.toLowerCase().includes(k.toLowerCase()));
    if (key) {
        const data = objectDescriptions[key];
        infoTitle.innerText = key;
        infoText.innerText = data.text;
        Object.assign(infoWindow.style, { top: data.pos.top, bottom: data.pos.bottom, left: data.pos.left, right: data.pos.right, display: 'block' });
        gsap.fromTo(infoWindow, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 });
    }
}

function switchToModelCamera(name, mesh) {
    isZoomed = true; controls.enabled = false;
    gsap.to([infoWindow, portfolioOverlay], { opacity: 0, duration: 0.3, onComplete: () => { 
        infoWindow.style.display = 'none'; 
        portfolioOverlay.style.display = 'none';
        portfolioOverlay.src = "";
        clickShield.style.display = 'none';
    }});

    if (whooshSound.buffer) whooshSound.play();

    // Force map lookup for Monitor, Katana, and Danto
    let camName = objectToCameraMap[name] || Object.keys(modelCameras).find(k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase()));

    if (modelCameras[camName]) {
        const targetCam = modelCameras[camName];
        targetCam.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        targetCam.getWorldPosition(worldPos);
        targetCam.getWorldQuaternion(worldQuat);

        gsap.to(mainCamera, { fov: targetCam.fov, duration: 1.5, ease: "power3.inOut", onUpdate: () => mainCamera.updateProjectionMatrix() });
        gsap.to(mainCamera.position, { x: worldPos.x, y: worldPos.y, z: worldPos.z, duration: 1.5, ease: "power3.inOut", onUpdate: () => mainCamera.quaternion.slerp(worldQuat, 0.1), onComplete: () => { 
            showInfo(name); 
        } });
        const meshPos = new THREE.Vector3(); mesh.getWorldPosition(meshPos);
        gsap.to(controls.target, { x: meshPos.x, y: meshPos.y, z: meshPos.z, duration: 1.5 });
    } else {
        zoomToTarget(mesh, name);
    }
}

function zoomToTarget(target, name) {
    isZoomed = true;
    const pos = new THREE.Vector3(); target.getWorldPosition(pos);
    gsap.to(mainCamera.position, { x: pos.x + 1.5, y: pos.y + 0.5, z: pos.z + 2, duration: 1.5, ease: "power3.inOut", onUpdate: () => mainCamera.lookAt(pos), onComplete: () => { 
        showInfo(name); 
    } });
}

function resetCamera() {
    isZoomed = false;
    gsap.to([infoWindow, portfolioOverlay], { opacity: 0, duration: 0.5, onComplete: () => { 
        infoWindow.style.display = 'none'; 
        portfolioOverlay.style.display = 'none';
        portfolioOverlay.src = "";
        clickShield.style.display = 'none';
    }});
    if (whooshSound.buffer) whooshSound.play();
    gsap.to(mainCamera, { fov: 75, duration: 1.2, ease: "power3.inOut", onUpdate: () => mainCamera.updateProjectionMatrix() });
    gsap.to(mainCamera.position, { x: 5, y: 5, z: 5, duration: 1.2, ease: "power3.inOut", onStart: () => { controls.enabled = true; } });
    gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
}

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, mainCamera); }
animate();

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    mainCamera.aspect = width / height;

    // MOBILE RESPONSIVE FOV
    if (width < 768) {
        mainCamera.fov = 90; 
    } else {
        mainCamera.fov = 75;
    }

    mainCamera.updateProjectionMatrix();
    renderer.setSize(width, height);
});
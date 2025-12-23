import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import nipplejs from 'nipplejs'
import dialogs from "/public/data/dialogs.json"


// Window
const canvas = document.querySelector('canvas.webgl')

const text = dialogs
let textDiv = document.getElementById("dialogs")

const saySentence = (text) => {
    textDiv.innerText = text
	setTimeout(() => { textDiv.innerText = "" }, 5000)
}
saySentence(text.gettingStarted.loaded)

// Scene
const scene = new THREE.Scene()


// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)


// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)


// Models
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let mixer = null

gltfLoader.load(
    '/models/scene.glb',
    (gltf) => scene.add(gltf.scene)
)


// Player
const player = new THREE.Object3D()
player.position.set(24, 6.7, 19)
scene.add(player)

camera.position.set(0, 0, 0)
player.add(camera)

let yaw = Math.PI / 2 
let pitch = 0

const maxPitch = Math.PI / 2.5
const lookSpeed =  0.005//0.025 //0.015
const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

pitch = clamp(pitch, -maxPitch, maxPitch)
yaw = yaw % (Math.PI * 2) 

// Joysticks
let moveInput = { x: 0, y: 0 }

const joystickMove = nipplejs.create({
    zone: document.getElementById('joystick-move'),
    mode: 'static',
    position: { left: '80px', bottom: '80px' },
    color: 'white'
})

joystickMove.on('move', (evt, data) => {
    moveInput.x = data.vector.x
    moveInput.y = data.vector.y
})

joystickMove.on('end', () => {
    moveInput.x = 0
    moveInput.y = 0
})


const joystickLook = nipplejs.create({
  zone: document.getElementById('joystick-look'),
  mode: 'static',
  position: { right: '80px', bottom: '80px' },
  color: 'white'
})

let yawDelta = 0
let pitchDelta = 0

joystickLook.on('move', (evt, data) => {
  yawDelta = -data.vector.x * lookSpeed
  pitchDelta = data.vector.y * lookSpeed
})

joystickLook.on('end', () => {
  yawDelta = 0
  pitchDelta = 0
})

// Movement
const speed = 0.015
const forward = new THREE.Vector3()
const right = new THREE.Vector3()

const updateMovement = () => {
  const prevPosition = player.position.clone()

  forward.set(0, 0, -1).applyQuaternion(player.quaternion)
  right.set(1, 0, 0).applyQuaternion(player.quaternion)

  const moveX = right.clone().multiplyScalar(moveInput.x * speed)
  const moveZ = forward.clone().multiplyScalar(moveInput.y * speed)

  const desiredMove = new THREE.Vector3().add(moveX).add(moveZ)

  // Test Z
  if (!isInsideAllowedZone(new THREE.Vector2(
    prevPosition.x,
    prevPosition.z + desiredMove.z
  ))) {
    desiredMove.z = 0
  }

  // Test X
  if (!isInsideAllowedZone(new THREE.Vector2(
    prevPosition.x + desiredMove.x,
    prevPosition.z
  ))) {
    desiredMove.x = 0
  }

  player.position.add(desiredMove)
}


// Hitboxes
const allowedZones = [
  { xMin: -15, xMax: 27.7, zMin: 10, zMax: 22.5 },
  { xMin: -22, xMax: -12, zMin: -16, zMax: 17 },
  { xMin: -15, xMax: 8, zMin: -27, zMax: -10 },
]

const isInsideAllowedZone = (pos) => {
	return allowedZones.some(zone =>
		pos.x > zone.xMin &&
		pos.x < zone.xMax &&
		pos.y > zone.zMin &&
		pos.y < zone.zMax
	)
}


// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
scene.add(ambientLight)

const pointLight = new THREE.PointLight("red", 2, 1.8, Math.PI * 0.1, 0.25, 1)
pointLight.position.set(3.55, 12.2, 6.4)
scene.add(pointLight)
/*
const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2)
scene.add(pointLightHelper)
*/
const addLampLight = (x, y, z) => {
	const pointLight = new THREE.PointLight(0xebab34, 4.5, 12, Math.PI * 0.1, 0.25, 1)
	pointLight.position.set(x, y, z)
	scene.add(pointLight)
}

const lampsPositions = [
	{ x: -0.15, y: 9.7, z: 21.8 },
	{ x: -24.57, y: 10.82, z: 18.2 },
	{ x: 18.2, y: 9.7, z: 5.8 },
	{ x: -9.7, y: 9.7, z: 3.7 },
	{ x: -0.4, y: 9.7, z: -9.4 },
	{ x: -6.1, y: 10.4, z: -24.5 },
	{ x: 12.7, y: 10.4, z: -24.7 },
	{ x: -24.5, y: 10.6, z: -16.4 },
]

for(let lamp of lampsPositions) addLampLight(lamp.x, lamp.y, lamp.z)

scene.fog = new THREE.FogExp2(0x0b1d2a, 0.02)
//scene.background = new THREE.Color(0x0b1d2a)



// Sky
const loader = new THREE.TextureLoader()
const texture = loader.load('/images/night-sky.jpg')

const materials = [
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
]

const skybox = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), materials)
scene.add(skybox)

// Snow
const count = 1000
const snowGeometry = new THREE.BufferGeometry()
const positions = []

for (let i = 0; i < count; i++) {
  const x = (Math.random() - 0.5) * 100
  const y = Math.random() * 40
  const z = (Math.random() - 0.5) * 100
  positions.push(x, y, z)
}

snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

// Material des particules
const snowMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.2,
  transparent: true,
  opacity: 0.8,
  roundPoints: true
})

// Points
const snow = new THREE.Points(snowGeometry, snowMaterial)
scene.add(snow)

const animateSnow = () => {
	const positions = snowGeometry.attributes.position.array

	for (let i = 1; i < positions.length; i += 3) {
		positions[i] -= 0.02 + Math.random() * 0.02
		positions[i-2] += Math.sin(Date.now() * 0.001 + i) * 0.01
		positions[i-0] += Math.cos(Date.now() * 0.001 + i) * 0.01
		
		if (positions[i] < 0) positions[i] = 40
	}
	snowGeometry.attributes.position.needsUpdate = true
}


// Animation function
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    if(mixer) mixer.update(deltaTime)

    yaw += yawDelta
    pitch += pitchDelta
    pitch = clamp(pitch, -maxPitch, maxPitch)

    player.rotation.y = yaw
    camera.rotation.x = pitch

    updateMovement()
	animateSnow()
    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()


// GUI
const gui = new GUI()

const cameraTweaks = gui.addFolder('Caméra')
cameraTweaks.add(camera.position, 'x').min(-60).max(60).step(0.1).name('X Position')
cameraTweaks.add(camera.position, 'z').min(-40).max(40).step(0.1).name('Z Position')


const lightTweaks = gui.addFolder('Lumières')
lightTweaks.add(ambientLight, 'intensity').min(0).max(10).step(0.01).name('Lumière ambiante')
lightTweaks.add(pointLight, 'intensity').min(0).max(10).step(0.01).name('Lumière Lampadaire')

lightTweaks.add(pointLight.position, 'x').min(-30).max(30).step(0.001).name('x')
lightTweaks.add(pointLight.position, 'y').min(-30).max(30).step(0.001).name('y')
lightTweaks.add(pointLight.position, 'z').min(-30).max(30).step(0.001).name('z')

gui.hide()


// PWA Full-Screen
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('SW registration failed', err))
  })
}

function goFullScreen() {
	if (document.body.requestFullscreen) document.body.requestFullscreen()
	else if (document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen()
	else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen()
}

canvas.addEventListener('click', () => {
  	goFullScreen()
})
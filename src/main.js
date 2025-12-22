import * as THREE from "three"
//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import nipplejs from 'nipplejs'
import dialogs from "/public/data/dialogs.json"

// Window
const canvas = document.querySelector('canvas.webgl')

const text = dialogs
let textDiv = document.getElementById("dialogs")
console.log(text)

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
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    // Update renderer
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
    (gltf) =>
    {
        scene.add(gltf.scene)
    }
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
const lookSpeed = 0.015
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
const speed = 0.03
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
const playerRadius = 0.5
const getPlayer2D = () => new THREE.Vector2(player.position.x, player.position.z) 

const allowedZones = [
  // branche gauche du U
  { xMin: -15, xMax: 27.7, zMin: 10, zMax: 22.5 },
  // fond du U
  { xMin: -22, xMax: -12, zMin: -16, zMax: 17 },
  // branche droite du U
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)
/*
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)
*/

// Animation function
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    if(mixer) mixer.update(deltaTime)

    // Update controls

    yaw += yawDelta
    pitch += pitchDelta
    pitch = clamp(pitch, -maxPitch, maxPitch)

    player.rotation.y = yaw
    camera.rotation.x = pitch

    updateMovement()
	console.log(player.position.x, player.position.z)

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
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

/*
lightTweaks.add(directionalLight, 'intensity').min(0).max(10).step(0.01).name('Lumière dirigée')
lightTweaks.add(directionalLight.position, 'x').min(0).max(15).step(0.1).name('X')
lightTweaks.add(directionalLight.position, 'y').min(0).max(15).step(0.1).name('Y')
lightTweaks.add(directionalLight.position, 'z').min(0).max(15).step(0.1).name('Z')
*/



//gui.hide()

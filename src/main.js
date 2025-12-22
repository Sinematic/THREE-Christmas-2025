import * as THREE from "three"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import nipplejs from 'nipplejs'

// Window
const canvas = document.querySelector('canvas.webgl')


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

// Controls
/*
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 1, 0)
controls.enableDamping = true
*/

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
player.position.set(25, 6.7, 19) // hauteur des yeux
scene.add(player)

camera.position.set(0, 0, 0)
player.add(camera)

// Rotation (Look)
let yaw = 0
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

// joystick caméra
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
  player.rotation.y = yaw
  camera.rotation.x = pitch

  forward.set(0, 0, -1).applyQuaternion(player.quaternion)
  player.position.addScaledVector(forward, moveInput.y * speed)

  right.set(1, 0, 0).applyQuaternion(player.quaternion)
  player.position.addScaledVector(right, moveInput.x * speed)
}

// Hitboxes
const walls = []

scene.traverse((obj) => {
  if(obj.isMesh && obj.userData.isWall) walls.push(obj)
})


// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)
scene.add(new THREE.DirectionalLight(0xffffff, 1));

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
    //controls.update()

    yaw += yawDelta
    pitch += pitchDelta
    pitch = clamp(pitch, -maxPitch, maxPitch)

    player.rotation.y = yaw
    camera.rotation.x = pitch
    updateMovement()


    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

// GUI
const gui = new GUI()

const cameraTweaks = gui.addFolder('Caméra')
cameraTweaks.add(camera.position, 'x').min(-25).max(25).step(0.1).name('X Position')
cameraTweaks.add(camera.position, 'y').min(-1).max(10).step(0.1).name('Y Position')
cameraTweaks.add(camera.position, 'z').min(-25).max(25).step(0.1).name('Z Position')

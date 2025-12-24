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

const joystickToHideMove = document.getElementById('joystick-move')
const joystickToHideLook = document.getElementById('joystick-look')


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

let gnomeModel = null

gltfLoader.load(
    '/models/scene.glb',
    (gltf) => scene.add(gltf.scene)
)

let pingwinGuide = null

gltfLoader.load(
    '/models/pingwin-guide.glb',
    (gltf) => {
		pingwinGuide = gltf.scene
		pingwinGuide.position.set(22, 4.3, 19)
		pingwinGuide.scale.set(0.7, 0.7, 0.7)
		pingwinGuide.rotateY(4.7)
		scene.add(pingwinGuide)
	}
)

gltfLoader.load(
    '/models/ugly_gnome_max.glb',
    (gltf) =>  {
		gnomeModel = gltf.scene
		gnomeModel.scale.set(0.25, 0.25, 0.25)
		
		const sisterGnome = gnomeModel.clone()
		sisterGnome.position.set(13, 4.3, 7.9)
		sisterGnome.rotateY(180)
		
		const meGnome = gnomeModel.clone()
		meGnome.position.set(-9, 4.3, -1.2)
		meGnome.rotateY(3)

		const candiGnome = gnomeModel.clone()
		candiGnome.position.set(-23, 4.3, -3.9)

		const camiGnome = gnomeModel.clone()
		camiGnome.position.set(-23, 4.3, -4.7)

		const grannyGnome = gnomeModel.clone()
		grannyGnome.position.set(6.4, 4.3, -23)
		grannyGnome.rotateY(180)

		const girlfriendGnome = gnomeModel.clone()
		girlfriendGnome.position.set(-24, 4.3, 8)
		girlfriendGnome.rotateY(12)

		const momGnome = gnomeModel.clone()
		momGnome.position.set(-7.1, 4.3, 23.5)
		momGnome.rotateY(33)

		const dadGnome = gnomeModel.clone()
		dadGnome.position.set(-7.9, 4.3, 23.7)
		dadGnome.scale.set(0.3, 0.3, 0.3)
		dadGnome.rotateY(33)

		const auntGnome = gnomeModel.clone()
		auntGnome.position.set(-4, 4.3, -23)
		auntGnome.rotateY(180)

		const uncleGnome = gnomeModel.clone()
		uncleGnome.position.set(-5, 4.3, -23)
		uncleGnome.rotateY(180)
	
		scene.add(sisterGnome, meGnome, girlfriendGnome, momGnome, dadGnome, grannyGnome, auntGnome, uncleGnome, candiGnome, camiGnome)
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
const lookSpeed =  0.015
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0)
scene.add(ambientLight)

const lightForPengwinInTrash = new THREE.SpotLight(0xffffff, 5, 7, Math.PI / 4, 0.2)
lightForPengwinInTrash.position.set(1, 9.5, 3.9)
scene.add(lightForPengwinInTrash)

lightForPengwinInTrash.target.position.set(1, 6, 3)
scene.add(lightForPengwinInTrash.target)


const startIntensity = 0
const targetIntensity = 0.3
const duration = 20000
const startTime = performance.now()

const updateAmbientLight = () => {
  const elapsed = performance.now() - startTime
  const t = Math.min(elapsed / duration, 1)

  ambientLight.intensity = startIntensity + (targetIntensity - startIntensity) * t
}

const bluntLight = new THREE.SpotLight( "red", 4.2, 0.5, Math.PI / 6, 0.6)
bluntLight.position.set(3.55, 12.2, 6.4)
scene.add(bluntLight)

bluntLight.target.position.set(3.55, 12.2, 5.7);
scene.add(bluntLight.target)

new THREE.PointLight

const addLampLight = (x, y, z) => {
	const spotLight = new THREE.SpotLight(0xebab34, 10, 12, Math.PI, 0.25, 1)
	spotLight.position.set(x, y, z)
	spotLight.castShadow = false
	spotLight.target.position.set(x, y - 3, z)
	scene.add(spotLight)
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

// Sky & Fog
scene.fog = new THREE.FogExp2(0x0b1d2a, 0.02)

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
const snowGeometry = new THREE.BufferGeometry();
const positions = []
const offsetsX = []
const offsetsZ = []

for (let i = 0; i < count; i++) {
  positions.push(
    (Math.random() - 0.5) * 80,  // x
    Math.random() * 40,           // y
    (Math.random() - 0.5) * 80   // z
  );
  offsetsX.push(Math.random() * Math.PI * 2);
  offsetsZ.push(Math.random() * Math.PI * 2);
}

snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

const snowMaterial = new THREE.PointsMaterial({
	color: 0xffffff,
	size: 0.3,
	transparent: true,
	sizeAttenuation: true,
})


const snow = new THREE.Points(snowGeometry, snowMaterial);
scene.add(snow)

const animateSnow = () => {
	const pos = snowGeometry.attributes.position.array
	const t = performance.now() * 0.001

	for (let i = 1, j = 0; i < pos.length; i += 3, j++) {
		pos[i] -= 0.02 + Math.random() * 0.02
		pos[i-2] += Math.sin(t + offsetsX[j]) * 0.01
		pos[i-0] += Math.cos(t + offsetsZ[j]) * 0.01

		if (pos[i] < 0) pos[i] = 40
	}
	snowGeometry.attributes.position.needsUpdate = true
}

// Dialogs
let playingDialogs = false

const saySentence = (text) => {
  playingDialogs = true
  joystickToHideMove.style.opacity = 0
  joystickToHideLook.style.opacity = 0

  // On transforme tout en tableau pour simplifier
  const lines = Array.isArray(text) ? text : [text]
  let i = 0

  const showLine = () => {

    if (i >= lines.length) {
		textDiv.innerText = ""
		joystickToHideMove.style.opacity = 1
		joystickToHideLook.style.opacity = 1
		playingDialogs = false
		return
    }

	ambientLight.intensity = Math.min(
		ambientLight.intensity + 0.0005,
		0.2
	);

    textDiv.innerText = lines[i]
    i++

    setTimeout(showLine, 5000)
  }

  showLine()
}


saySentence(text.guide)



setTimeout(() => { scene.remove(pingwinGuide) }, 60000)


// Detection for dialogs
const hasPlayedScene = {
	guide: { status:false },	
	roofPengwins: {
		positions: { x: 5.66, y: 14, z: 2.7},
		distance: 15,
		status:false
	},	
	trashPengwin: {
		positions: { x: 5.66, y: 7, z: 2.7},
		distance: 10,
		status:false
	},
	snowman: {
		positions: { x: -17.9, y: 6.7, z: 19.67},
		status:false
	},
	drunkPengwin: {
		positions: { x: -9, y: 5.7, z: -5.4},
		status:false
	},
	christmasChoir: {
		positions: { x: -18.6, y: 6.7, z: -17.9},
		distance: 7,
		status:false
	},
	sweaterPengwin: {
		positions: { x: 4.92, y: 5.7, z: -22.3},
		status:false
	},
	cousinsGnomes: {
		positions: { x: -23, y: 7.13, z: -3.9 },
		status:false
	},
	auntAndUncleGnomes: {
		positions: { x: -4, y: 5, z: -23 },
		status:false
	},
	grannyGnome: {
		positions: { x: 6.4, y: 5, z: -22.36 },
		status:false
	},
	parentsGnomes: {
		positions: { x: -7.6, y: 5, z: 23.5 },
		status:false
	},
	meGnome: {
		positions: { x: -9, y: 5, z: -0.23 },
		status:false
	},
	girlfriendGnome: {
		positions: { x: -24, y: 4.5, z: 8 },
		status:false
	},
	sisterGnome: {
		positions: { x: 13, y: 5, z: 7.9 },
		status:false
	},
	yakuzaPengwin: {
		positions: { x: 5.66, y: 8.6, z: -12 },
		status:false
	},
	suspiciousGift: {
		positions: { x: 10, y: 7, z: -9},
		status:false
	},
	noFeet: { status:false },
	starrySky: { status:false }
}

const dialogueThresholdDist = 5
const dialogueThresholdAngle = 0.8


const checkDialogs = () => {
	const camPos = player.position
	const camDir = new THREE.Vector3()
	camera.getWorldDirection(camDir)

	Object.keys(hasPlayedScene).forEach(key => {
		const sceneItem = hasPlayedScene[key]

		if (sceneItem.status || !sceneItem.positions) return

			const targetPos = new THREE.Vector3(
				sceneItem.positions.x,
				sceneItem.positions.y,
				sceneItem.positions.z
			)

			const distance = camPos.distanceTo(targetPos)
			const toTarget = new THREE.Vector3().subVectors(targetPos, camPos).normalize()
			const angleDot = camDir.dot(toTarget)

			let effectiveDistance = hasPlayedScene[key].distance ? hasPlayedScene[key].distance : dialogueThresholdDist

			if (distance < effectiveDistance && angleDot > dialogueThresholdAngle) {
				console.log(key)
				saySentence(text[key])
				sceneItem.status = true
		}
	})
}


// Animation function
const clock = new THREE.Clock()
let previousTime = 0
let lastCheck = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

	updateAmbientLight()

    if(mixer) mixer.update(deltaTime)

    yaw += yawDelta
    pitch += pitchDelta
    pitch = clamp(pitch, -maxPitch, maxPitch)

    player.rotation.y = yaw
    camera.rotation.x = pitch

	if(previousTime - lastCheck > 0.2) {
		checkDialogs()
		lastCheck = previousTime

		const camDirection = new THREE.Vector3()
		camera.getWorldDirection(camDirection)

		if(!hasPlayedScene.starrySky.status) {

			const starryDialog = new THREE.Vector3(0, 1, 0).normalize()
			const threshold = 0.8
			if((camDirection.dot(starryDialog) > threshold)) {
				saySentence(text.easterEggs.starrySky)
				hasPlayedScene.starrySky.status = true
			}
		}

		if(!hasPlayedScene.noFeet.status) {

			const noFeetDialog = new THREE.Vector3(0, -1, 0).normalize()
			const threshold = 0.9
			console.log((camDirection.dot(noFeetDialog) > threshold))
			if((camDirection.dot(noFeetDialog) > threshold)) {
				saySentence(text.easterEggs.noFeet)
				hasPlayedScene.noFeet.status = true
			}
		}
	}

    updateMovement()
	animateSnow()
    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()


// GUI
/*
const gui = new GUI()
/*
const cameraTweaks = gui.addFolder('Caméra')
cameraTweaks.add(camera.position, 'x').min(-60).max(60).step(0.1).name('X Position')
cameraTweaks.add(camera.position, 'z').min(-40).max(40).step(0.1).name('Z Position')

const lightTweaks = gui.addFolder('Lumières')
lightTweaks.add(ambientLight, 'intensity').min(0).max(10).step(0.01).name('Lumière ambiante')
lightTweaks.add(directionalLight, 'intensity').min(0).max(10).step(0.01).name('Lumière Lampadaire')

lightTweaks.add(directionalLight.position, 'x').min(-30).max(30).step(0.001).name('x')
lightTweaks.add(directionalLight.position, 'y').min(-30).max(30).step(0.001).name('y')
lightTweaks.add(directionalLight.position, 'z').min(-30).max(30).step(0.001).name('z')

gui.hide()
*/

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
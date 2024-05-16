import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, Vector3, HighlightLayer, ActionManager, ExecuteCodeAction, StandardMaterial, Color3, DirectionalLight, ShaderMaterial } from '@babylonjs/core';
import { CreateDashedLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';

// Vertex shader code
const vertexShader = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vPosition;

  void main(void) {
    vPosition = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// Fragment shader code
const fragmentShader = `
  precision highp float;
  varying vec3 vPosition;

  void main(void) {
    float distance = length(vPosition);
    float fadeDistance = 10.0; // Define a maximum distance for fading
    float alpha = 1.0 - smoothstep(0.0, fadeDistance, distance);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

function createScene(canvasId, cubeColor, cubeName) {
  const canvas = document.getElementById(canvasId);
  const engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: true, stencil: true, alpha: true });

  // Adjust resolution by setting the device pixel ratio
  engine.setHardwareScalingLevel(1 / window.devicePixelRatio);

  const scene = new Scene(engine);

  const camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 6, new Vector3(0, 2, 0), scene);
  camera.target = new Vector3(0, 0, 0);
  camera.attachControl(canvas, true);

  // Create an ambient light
  const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), scene);
  ambientLight.intensity = 0.5; // Adjust the intensity as needed

  // Create a directional light
  const directionalLight = new DirectionalLight("directionalLight", new Vector3(1, -1, 0), scene);
  directionalLight.intensity = 0.8; // Adjust the intensity as needed

  // Create the cube with the specified color
  const cube = MeshBuilder.CreateBox(cubeName, { size: 1 }, scene);
  const material = new StandardMaterial(`${cubeName}Material`, scene);
  material.diffuseColor = cubeColor;
  cube.material = material;

  // Configure HighlightLayer with higher resolution settings
  const highlightLayer = new HighlightLayer("hl1", scene, {
    mainTextureFixedSize: 2048, // Higher resolution for the highlight texture
    blurTextureSizeRatio: 0.5  // Lower ratio for less blur
  });

  cube.actionManager = new ActionManager(scene);
  cube.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, function () {
    toggleRotationAndHighlight();
  }));

  // Create the dashed line that fades into the distance
  createDashedLine(scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });

  return { scene, cube, engine, highlightLayer };
}

function createDashedLine(scene) {
  const points = [];
  const lineLength = 10;

  for (let i = -lineLength; i <= lineLength; i++) {
    points.push(new Vector3(i, 0, 0));
  }

  const options = {
    points: points,
    dashSize: 0.25,
    gapSize: 0.1,
    dashNb: lineLength * 2,
    updatable: true
  };

  const dashedLine = MeshBuilder.CreateDashedLines("dashedLine", options, scene);

  // Shader material for fading effect
  const shaderMaterial = new ShaderMaterial("shader", scene, {
    vertexSource: vertexShader,
    fragmentSource: fragmentShader,
    attributes: ["position"],
    uniforms: ["worldViewProjection"],
  });

  // Enable transparency
  shaderMaterial.needAlphaBlending = () => true;

  dashedLine.material = shaderMaterial;
  dashedLine.hasVertexAlpha = true; // Enable vertex alpha
}

const scene1 = createScene("canvas1", Color3.White(), "cube1");
const scene2 = createScene("canvas2", Color3.Red(), "cube2");

let isRotating = false;
let isHighlighted = false;

function toggleRotationAndHighlight() {
  isRotating = !isRotating;
  isHighlighted = !isHighlighted;

  if (isRotating) {
    scene1.engine.runRenderLoop(() => {
      scene1.cube.rotation.y += 0.01;
      scene2.cube.rotation.y += 0.01;
      scene1.scene.render();
      scene2.scene.render();
    });
  } else {
    scene1.engine.stopRenderLoop();
    scene1.engine.runRenderLoop(() => scene1.scene.render());
    scene2.engine.runRenderLoop(() => scene2.scene.render());
  }

  if (isHighlighted) {
    scene1.highlightLayer.addMesh(scene1.cube, Color3.Yellow());
    scene2.highlightLayer.addMesh(scene2.cube, Color3.Yellow());
  } else {
    scene1.highlightLayer.removeMesh(scene1.cube);
    scene2.highlightLayer.removeMesh(scene2.cube);
  }
}

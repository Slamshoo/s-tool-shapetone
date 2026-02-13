import * as THREE from 'three';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let currentMesh: THREE.Mesh | null = null;
let renderTarget: HTMLCanvasElement | null = null;

// Auto-rotation state
let autoRotationY = 0;
const ROTATION_SPEED = 0.005;

function ensureRenderer(width: number, height: number): void {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    // Transparent background — alpha channel used as mask in brightness grid
    renderer.setClearColor(0x000000, 0);
  }
  if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
    renderer.setSize(width, height, false);
  }

  if (!scene) {
    scene = new THREE.Scene();

    // Low ambient for deep shadows
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    // Strong key light from top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(1, 1.5, 1).normalize();
    scene.add(keyLight);

    // Subtle fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
    fillLight.position.set(-1, -0.3, -0.5).normalize();
    scene.add(fillLight);
  }

  if (!camera) {
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function fitCameraToMesh(mesh: THREE.Mesh): void {
  if (!camera) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  mesh.position.sub(center); // center the mesh at origin

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.5;

  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function parseOBJ(text: string): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const tempVerts: number[][] = [];
  const tempNormals: number[][] = [];

  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v' && parts.length >= 4) {
      tempVerts.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === 'vn' && parts.length >= 4) {
      tempNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === 'f') {
      // Triangulate face (fan triangulation for quads/n-gons)
      const faceVerts: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const idx = parseInt(parts[i].split('/')[0], 10);
        faceVerts.push(idx > 0 ? idx - 1 : tempVerts.length + idx);
      }
      for (let i = 1; i < faceVerts.length - 1; i++) {
        indices.push(faceVerts[0], faceVerts[i], faceVerts[i + 1]);
      }
    }
  }

  for (const v of tempVerts) {
    vertices.push(v[0], v[1], v[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);

  if (tempNormals.length > 0) {
    // Simple case: use temp normals if count matches vertices
    const flatNormals: number[] = [];
    for (const n of tempNormals) {
      flatNormals.push(n[0], n[1], n[2]);
    }
    if (flatNormals.length === vertices.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(flatNormals, 3));
    } else {
      geometry.computeVertexNormals();
    }
  } else {
    geometry.computeVertexNormals();
  }

  return geometry;
}

function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  const geometry = new THREE.BufferGeometry();

  // Check if binary STL (starts with 80 byte header + uint32 triangle count)
  // ASCII STL starts with "solid"
  const headerText = String.fromCharCode(...new Uint8Array(buffer, 0, 5));
  const isAscii = headerText === 'solid';

  if (isAscii) {
    return parseSTLAscii(new TextDecoder().decode(buffer));
  }

  // Binary STL
  const triangleCount = view.getUint32(80, true);
  const vertices = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);

    for (let v = 0; v < 3; v++) {
      const vOffset = offset + 12 + v * 12;
      const idx = i * 9 + v * 3;
      vertices[idx] = view.getFloat32(vOffset, true);
      vertices[idx + 1] = view.getFloat32(vOffset + 4, true);
      vertices[idx + 2] = view.getFloat32(vOffset + 8, true);
      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function parseSTLAscii(text: string): THREE.BufferGeometry {
  const vertices: number[] = [];
  const normals: number[] = [];

  const facePattern = /facet\s+normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
  const vertexPattern = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;

  let faceMatch = facePattern.exec(text);
  while (faceMatch) {
    const nx = parseFloat(faceMatch[1]);
    const ny = parseFloat(faceMatch[2]);
    const nz = parseFloat(faceMatch[3]);

    // Find the 3 vertices after this face
    for (let i = 0; i < 3; i++) {
      const vertMatch = vertexPattern.exec(text);
      if (vertMatch) {
        vertices.push(parseFloat(vertMatch[1]), parseFloat(vertMatch[2]), parseFloat(vertMatch[3]));
        normals.push(nx, ny, nz);
      }
    }

    faceMatch = facePattern.exec(text);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

export async function load3DObject(file: File): Promise<void> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let geometry: THREE.BufferGeometry;

  if (ext === 'obj') {
    const text = await file.text();
    geometry = parseOBJ(text);
  } else if (ext === 'stl') {
    const buffer = await file.arrayBuffer();
    geometry = parseSTL(buffer);
  } else {
    throw new Error(`Unsupported 3D format: .${ext}`);
  }

  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0x222222,
    shininess: 20,
  });

  if (currentMesh && scene) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    (currentMesh.material as THREE.Material).dispose();
  }

  currentMesh = new THREE.Mesh(geometry, material);
  autoRotationY = 0;
}

export function render3DToCanvas(
  width: number,
  height: number,
  autoRotate: boolean,
  manualRotX: number,
  manualRotY: number,
): HTMLCanvasElement | null {
  if (!currentMesh) return null;

  ensureRenderer(width, height);
  if (!renderer || !scene || !camera) return null;

  // Add mesh to scene if not already
  if (!currentMesh.parent) {
    scene.add(currentMesh);
    fitCameraToMesh(currentMesh);
  }

  // Apply rotation: auto-rotation accumulates, manual is additive
  if (autoRotate) {
    autoRotationY += ROTATION_SPEED;
  }
  currentMesh.rotation.x = manualRotX;
  currentMesh.rotation.y = autoRotationY + manualRotY;

  renderer.render(scene, camera);

  // Copy to a regular canvas for brightness sampling
  if (!renderTarget) {
    renderTarget = document.createElement('canvas');
  }
  if (renderTarget.width !== width || renderTarget.height !== height) {
    renderTarget.width = width;
    renderTarget.height = height;
  }
  const ctx = renderTarget.getContext('2d')!;
  // Clear previous frame completely (important for transparent background)
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(renderer.domElement, 0, 0);

  return renderTarget;
}

export function has3DObject(): boolean {
  return currentMesh !== null;
}

export function clear3DObject(): void {
  if (currentMesh && scene) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    (currentMesh.material as THREE.Material).dispose();
    currentMesh = null;
  }
}

export function get3DCanvasSize(): { width: number; height: number } {
  // 3D objects don't have a "native" size, so we use a reasonable render resolution
  return { width: 512, height: 512 };
}

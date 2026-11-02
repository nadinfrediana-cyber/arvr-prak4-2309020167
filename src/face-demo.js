// src/face-demo.js - Demonstrasi 2: face tracking dengan efek bintang (MindAR + Three.js)
import * as THREE from 'three';
import { MindARThree } from '../vendor/mindar/mindar-face-three.prod.js';
import { setStatus, setupStartButton } from './common.js';

// Konstanta yang boleh Anda ubah untuk menyetel efek bintang.
const ANCHOR_INDEX = 168;     // titik landmark di antara kedua mata
const STAR_COUNT = 10;        // jumlah bintang yang mengorbit
const STAR_SIZE = 0.09;       // ukuran bintang
const ORBIT_RADIUS = 0.55;    // jari-jari lingkaran orbit
const ORBIT_Y = 0.4;          // tinggi orbit dari titik antara mata (naik = ke dahi/kepala)
const ORBIT_SPEED = 1.2;      // kecepatan putaran
const STAR_COLOR = 0xfacc15;  // kuning emas

// Membuat bentuk bintang 5 sudut dari Shape lalu diberi ketebalan (extrude).
function createStarGeometry(outer, inner) {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  geo.center();
  return geo;
}

// Membuat kumpulan bintang yang mengorbit di sekitar kepala.
function buildStars() {
  const group = new THREE.Group();
  const geo = createStarGeometry(1, 0.45);
  const mat = new THREE.MeshStandardMaterial({
    color: STAR_COLOR,
    emissive: STAR_COLOR,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.4,
  });

  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = new THREE.Mesh(geo, mat);
    star.scale.setScalar(STAR_SIZE);
    group.add(star);
    stars.push({ mesh: star, phase: (i / STAR_COUNT) * Math.PI * 2 });
  }

  // Dipanggil tiap frame; t = waktu berjalan (detik).
  function update(t) {
    for (const s of stars) {
      const a = s.phase + t * ORBIT_SPEED;
      s.mesh.position.set(
        Math.cos(a) * ORBIT_RADIUS,
        ORBIT_Y + Math.sin(t * 2 + s.phase) * 0.06, // naik-turun pelan
        Math.sin(a) * ORBIT_RADIUS * 0.6
      );
      s.mesh.rotation.z = t * 1.5 + s.phase;         // berputar
      // Berkedip: ukuran berdenyut
      const twinkle = 0.75 + 0.25 * Math.sin(t * 5 + s.phase * 3);
      s.mesh.scale.setScalar(STAR_SIZE * twinkle);
    }
  }

  return { group, update };
}

async function start() {
  const mindarThree = new MindARThree({ container: document.getElementById('container') });
  const { renderer, scene, camera } = mindarThree;

  const anchor = mindarThree.addAnchor(ANCHOR_INDEX);
  const stars = buildStars();
  anchor.group.add(stars.group);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.4));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0, 1, 2);
  scene.add(dir);

  await mindarThree.start(); // minta kamera depan, memuat model deteksi wajah
  setStatus('Mencari wajah', 'searching');

  const clock = new THREE.Clock();
  let hadFace = false, lostCount = 0;
  renderer.setAnimationLoop(() => {
    // Anchor wajah tidak punya event found/lost; gunakan getLatestEstimate():
    // bernilai null jika tidak ada wajah pada frame terakhir.
    const hasFace = mindarThree.getLatestEstimate() !== null;
    if (hasFace !== hadFace) {
      hadFace = hasFace;
      if (hasFace) setStatus('Wajah terdeteksi', 'found');
      else { lostCount++; setStatus('Wajah tidak terdeteksi - mencari wajah', 'searching'); }
      document.getElementById('info').textContent = 'Wajah hilang ' + lostCount + ' kali.';
    }
    stars.update(clock.getElapsedTime());
    renderer.render(scene, camera);
  });
}

setupStartButton(start);
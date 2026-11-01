// constructor.ts — convierte una DefinicionModelo en objetos de Three.js (Sesión 40).
// Piezas = mallas con el color de su rol; enlaces = flechas (cilindro + cono)
// que salen del BORDE de una pieza y llegan al borde de otra; rótulos = sprites
// con texto dibujado en un canvas. Al final todo se normaliza: el modelo entra en
// una caja de 1,6 y su base queda en y = -0,8, igual que el cubo de las Sesiones 35-39,
// así la lógica de AR (apoyar la base en la superficie) no cambia.
import * as THREE from "three";
import { COLOR_ENLACE, ROLES, type DefinicionModelo, type Enlace, type Pieza } from "./tipos";

export const TAM_NORMALIZADO = 1.6;

export interface ModeloConstruido {
  /** Raíz ya normalizada: se cuelga de `grupo` en el visor. */
  raiz: THREE.Group;
  /** Altura del centro del modelo ya normalizado (su base está en -0,8). */
  centroY: number;
  /** Mallas de las piezas por id (con `userData.piezaId`): lo que se puede tocar. */
  piezas: Map<string, THREE.Mesh>;
  /** Resalta una pieza y atenúa el resto; null quita el resalte. */
  resaltar(id: string | null): void;
  destruir(): void;
}

interface FlechaConstruida {
  enlace: Enlace;
  materiales: THREE.MeshBasicMaterial[];
}

// ── Rótulos: texto dibujado en un canvas y pegado a un Sprite ──
function crearRotulo(texto: string, altura: number, pequeno = false): THREE.Sprite {
  const px = pequeno ? 40 : 56;
  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d")!;
  const fuente = `600 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = fuente;
  const ancho = Math.ceil(ctx.measureText(texto).width) + px;
  lienzo.width = ancho;
  lienzo.height = Math.round(px * 1.7);
  ctx.font = fuente; // cambiar el tamaño del canvas borra el contexto
  ctx.fillStyle = "rgba(11, 18, 32, 0.82)";
  const r = lienzo.height / 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, lienzo.width, lienzo.height, r);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2 + 2);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false }));
  sprite.renderOrder = 10; // siempre encima: el texto debe poder leerse
  sprite.scale.set((lienzo.width / lienzo.height) * altura, altura, 1);
  return sprite;
}

// ── Dónde sale y dónde llega una flecha: el punto del borde de la pieza en esa dirección ──
function puntoDeBorde(p: Pieza, centro: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 {
  const [w, h, d] = p.tam;
  let t: number;
  if (p.forma === "esfera") {
    t = w / 2;
  } else if (p.forma === "cilindro") {
    const radial = Math.hypot(dir.x, dir.z);
    const tRadial = radial > 1e-6 ? w / 2 / radial : Infinity;
    const tAxial = Math.abs(dir.y) > 1e-6 ? h / 2 / Math.abs(dir.y) : Infinity;
    t = Math.min(tRadial, tAxial);
  } else {
    const k = Math.max(Math.abs(dir.x) / w, Math.abs(dir.y) / h, Math.abs(dir.z) / d);
    t = 0.5 / k;
  }
  return centro.clone().addScaledVector(dir, t);
}

const EJE_Y = new THREE.Vector3(0, 1, 0);

/** Mide cuánto ocupa el modelo (su lado mayor): con eso se escalan rótulos y flechas para que se lean igual en todos. */
function lado(def: DefinicionModelo): number {
  const ejes = [0, 1, 2].map((i) => {
    const lo = Math.min(...def.piezas.map((p) => p.pos[i] - p.tam[i] / 2));
    const hi = Math.max(...def.piezas.map((p) => p.pos[i] + p.tam[i] / 2));
    return hi - lo;
  });
  return Math.max(...ejes);
}

function crearFlecha(e: Enlace, de: Pieza, a: Pieza, destino: THREE.Group, k: number): FlechaConstruida | null {
  const desvio = new THREE.Vector3(...(e.desvio ?? [0, 0, 0]));
  const cA = new THREE.Vector3(...de.pos).add(desvio);
  const cB = new THREE.Vector3(...a.pos).add(desvio);
  const dir = cB.clone().sub(cA).normalize();
  const inicio = puntoDeBorde(de, cA, dir).addScaledVector(dir, 0.06 * k);
  const fin = puntoDeBorde(a, cB, dir.clone().negate()).addScaledVector(dir, -0.06 * k);
  const largo = fin.clone().sub(inicio).length();
  const cabeza = Math.min(0.34 * k, largo * 0.45);
  if (largo < 0.12 * k) return null;

  const material = new THREE.MeshBasicMaterial({ color: COLOR_ENLACE[e.tipo], transparent: true });
  const flecha = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * k, 0.05 * k, largo - cabeza, 12), material);
  cuerpo.position.y = (largo - cabeza) / 2;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.14 * k, cabeza, 16), material);
  punta.position.y = largo - cabeza / 2;
  flecha.add(cuerpo, punta);
  flecha.position.copy(inicio);
  flecha.quaternion.setFromUnitVectors(EJE_Y, dir);
  destino.add(flecha);

  if (e.etiqueta) {
    const medio = inicio.clone().add(fin).multiplyScalar(0.5);
    // Una flecha casi vertical lleva su rótulo al lado; una horizontal, encima.
    if (Math.abs(dir.y) > 0.7) medio.x += 0.7 * k * Math.sign(desvio.x || 1);
    else medio.y += 0.3 * k;
    const rotulo = crearRotulo(e.etiqueta, 0.3 * k, true);
    rotulo.position.copy(medio);
    destino.add(rotulo);
  }
  return { enlace: e, materiales: [material] };
}

export function construirModelo(def: DefinicionModelo): ModeloConstruido {
  const k = lado(def) / 6; // 1 = un modelo de 6 unidades de lado
  const interior = new THREE.Group();
  const piezas = new Map<string, THREE.Mesh>();
  const porId = new Map(def.piezas.map((p) => [p.id, p]));
  const solido = new THREE.Group(); // piezas + base: con esto se mide el tamaño
  const decorado = new THREE.Group(); // flechas y rótulos: no cuentan para medir
  interior.add(solido, decorado);

  for (const p of def.piezas) {
    const [w, h, d] = p.tam;
    const geometria =
      p.forma === "esfera" ? new THREE.SphereGeometry(w / 2, 32, 20) : p.forma === "cilindro" ? new THREE.CylinderGeometry(w / 2, w / 2, h, 36) : new THREE.BoxGeometry(w, h, d);
    const color = ROLES[p.rol].color;
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, transparent: true, emissive: color, emissiveIntensity: 0 });
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(...p.pos);
    malla.userData.piezaId = p.id;
    if (p.forma === "caja") {
      const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(geometria), new THREE.LineBasicMaterial({ color: 0x0b1220 }));
      malla.add(aristas);
    }
    solido.add(malla);
    piezas.set(p.id, malla);

    const rotulo = crearRotulo(p.nombre, 0.4 * k);
    if (p.rotulo === "frente") rotulo.position.set(p.pos[0], p.pos[1], p.pos[2] + d / 2 + 0.05);
    else if (p.rotulo === "abajo") rotulo.position.set(p.pos[0], p.pos[1] - h / 2 - 0.45 * k, p.pos[2]);
    else rotulo.position.set(p.pos[0], p.pos[1] + h / 2 + 0.45 * k, p.pos[2]);
    decorado.add(rotulo);
  }

  // Base: una placa oscura bajo todo el modelo, para que «apoye» en algo.
  const caja = new THREE.Box3().setFromObject(solido);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(caja.max.x - caja.min.x + 1.4, 0.14, caja.max.z - caja.min.z + 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1c2b46, roughness: 0.9 })
  );
  base.position.set((caja.max.x + caja.min.x) / 2, caja.min.y - 0.1, (caja.max.z + caja.min.z) / 2);
  solido.add(base);

  const flechas: FlechaConstruida[] = [];
  for (const e of def.enlaces) {
    const de = porId.get(e.de);
    const a = porId.get(e.a);
    if (!de || !a) throw new Error(`Enlace con pieza desconocida: ${e.de} → ${e.a}`);
    const f = crearFlecha(e, de, a, decorado, k);
    if (f) flechas.push(f);
  }

  // Normalizar: caber en TAM_NORMALIZADO, centrado en x/z y con la base en y = -TAM/2.
  const medida = new THREE.Box3().setFromObject(solido);
  const tamano = medida.getSize(new THREE.Vector3());
  const centro = medida.getCenter(new THREE.Vector3());
  const escala = TAM_NORMALIZADO / Math.max(tamano.x, tamano.y, tamano.z);
  interior.scale.setScalar(escala);
  interior.position.set(-centro.x * escala, -TAM_NORMALIZADO / 2 - medida.min.y * escala, -centro.z * escala);
  const raiz = new THREE.Group();
  raiz.add(interior);

  function resaltar(id: string | null) {
    for (const [pid, malla] of piezas) {
      const m = malla.material as THREE.MeshStandardMaterial;
      const activa = id === null || pid === id;
      m.opacity = activa ? 1 : 0.28;
      m.depthWrite = activa;
      m.emissiveIntensity = id !== null && pid === id ? 0.55 : 0;
    }
    for (const f of flechas) {
      const toca = id === null || f.enlace.de === id || f.enlace.a === id;
      for (const m of f.materiales) m.opacity = toca ? 1 : 0.15;
    }
  }

  function destruir() {
    interior.traverse((o) => {
      const malla = o as THREE.Mesh & THREE.Sprite;
      (malla.geometry as THREE.BufferGeometry | undefined)?.dispose();
      const mat = malla.material as THREE.Material | THREE.Material[] | undefined;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        (m as THREE.SpriteMaterial).map?.dispose();
        m.dispose();
      }
    });
  }

  return { raiz, centroY: -TAM_NORMALIZADO / 2 + (tamano.y * escala) / 2, piezas, resaltar, destruir };
}

// visor.ts — escena de Three.js del Atlas 3D (Sesiones 35-40).
// Hasta la Sesión 39 el visor mostraba un CUBO DE PRUEBA. Desde la Sesión 40
// muestra los modelos de arquitectura (MVC, capas, microservicios): escenas
// construidas por código a partir de datos (carpeta modelos/).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { capacidadesDe, type CapacidadesAR } from "./xr";
import { crearGestos } from "./gestos";
import { construirModelo, type ModeloConstruido } from "./modelos/constructor";
import type { DefinicionModelo } from "./modelos/tipos";
import { anotar, PASO_FINAL } from "./rastro";

export interface Visor {
  /** Fija la rotación objetivo del modelo (radianes). El visor la alcanza suavemente. */
  rotarHacia(rotX: number, rotY: number): void;
  /** true: los sensores mandan (se apaga el ratón/táctil). false: control manual. */
  controlPorSensores(activo: boolean): void;
  /** Rotación actual del modelo, en grados (para mostrarla en pantalla). */
  rotacionActualGrados(): { x: number; y: number };
  /** true: sin color de fondo (se ve el video detrás). false: fondo azul oscuro. */
  fondoTransparente(activo: boolean): void;
  /**
   * Sesiones 38-39: pasa el render a una sesión WebXR.
   * `overlay` es el elemento HTML sobre la cámara: ahí se leen los gestos.
   * `alCambiar` avisa cada vez que cambia el estado (para mostrarlo en pantalla).
   * `alTerminar` se llama cuando la sesión se cierra.
   */
  entrarEnAR(sesion: XRSession, opciones: OpcionesAR): Promise<EstadoAR>;
  /** true mientras hay una sesión AR abierta. */
  enAR(): boolean;
  /** Sesión 40: reemplaza el modelo que se ve (construye su escena a partir de los datos). */
  mostrarModelo(def: DefinicionModelo): void;
  /** Sesión 40: resalta una pieza del modelo actual (null: ninguna). */
  seleccionar(piezaId: string | null): void;
  /** Sesión 40: avisa cuando el usuario toca una pieza (o el vacío) en la vista 3D. */
  alTocarPieza(avisar: (piezaId: string | null) => void): void;
  destruir(): void;
}

/** En qué punto está la colocación del objeto. */
export type FaseAR = "buscando" | "listo" | "colocado";

export interface EstadoAR extends CapacidadesAR {
  fase: FaseAR;
  /** true si el objeto está anclado: el sistema sigue corrigiendo su posición. */
  anclado: boolean;
  escala: number; // 1 = el tamaño del modelo (1,6 m); empieza en 0,25
  giroGrados: number;
  /** Centro del objeto en el espacio «local» (metros): x derecha, y arriba, -z adelante. */
  posicion: { x: number; y: number; z: number };
  /** Diagnóstico: cuántas veces se preguntó al hit-test y cuántas respondió con una superficie. */
  consultas: number;
  resultados: number; // consultas en que el sistema devolvió algo
  impactos: number; // consultas con una pose utilizable
  /** true si pasaron varios segundos sin superficie: el toque ya coloca delante de la mirada. */
  sinSuperficie: boolean;
}

export interface OpcionesAR {
  overlay: HTMLElement;
  alCambiar: (estado: EstadoAR) => void;
  alTerminar: () => void;
}

const ESCALA_INICIAL = 0.25; // el modelo (cabe en 1,6) queda en 40 cm
const ESCALA_VISTA = 3;
const DISTANCIA_VISTA = 6; // a cuánto de su centro mira la cámara de la vista normal // fuera de AR se ve más grande: hay rótulos que leer
const ESCALA_MIN = 0.1;
const ESCALA_MAX = 1;
const CADA_CUANTOS_FOTOGRAMAS = 2; // el hit-test se consulta un fotograma de cada dos: basta para una retícula fluida
const MS_HASTA_PLAN_B = 6000; // sin superficie tanto tiempo: se avisa y el toque coloca delante de la mirada
const CONSULTAS_SIN_IMPACTO = 8; // consultas seguidas sin superficie antes de ocultar la retícula (evita parpadeos)
const MITAD = 0.8; // medio cubo: para que apoye la base (y no el centro) en la superficie

export function crearVisor(contenedor: HTMLElement): Visor {
  const escena = new THREE.Scene();
  const COLOR_FONDO = new THREE.Color(0x0b1220);
  escena.background = COLOR_FONDO;

  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camara.position.set(0, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  contenedor.append(renderer.domElement);

  escena.add(new THREE.AmbientLight(0xffffff, 0.6));
  const luz = new THREE.DirectionalLight(0xffffff, 1.2);
  luz.position.set(3, 4, 5);
  escena.add(luz);

  // Dos niveles: `raiz` sigue a la superficie o al ancla (lo manda el sistema);
  // `grupo` es el objeto con lo que decide el usuario (mover, girar, escalar).
  const raiz = new THREE.Group();
  const grupo = new THREE.Group();
  grupo.scale.setScalar(ESCALA_VISTA);
  let modelo: ModeloConstruido | null = null;
  let piezaElegida: string | null = null;
  let centroY = 0; // altura del centro del modelo (para centrarlo en la vista normal)
  raiz.add(grupo);
  escena.add(raiz);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;

  let objetivoX = 0;
  let objetivoY = 0;
  let porSensores = false;

  // Sesión 42 (hallazgo de Lighthouse): dibujar 60 veces por segundo una escena QUIETA gasta batería y
  // ocupa el hilo principal. Se dibuja solo si algo cambió: «sucio» lo anota quien cambia algo.
  let sucio = true;

  function ajustarTamano() {
    const ancho = contenedor.clientWidth || 320;
    const alto = Math.min(Math.round(ancho * 0.75), 560);
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    sucio = true;
  }
  ajustarTamano();
  window.addEventListener("resize", ajustarTamano);

  let animacion = 0;
  function bucle() {
    animacion = requestAnimationFrame(bucle);
    if (porSensores) {
      // Interpolación: alcanza el objetivo poco a poco (filtra el temblor del sensor).
      grupo.rotation.x += (objetivoX - grupo.rotation.x) * 0.15;
      grupo.rotation.y += (objetivoY - grupo.rotation.y) * 0.15;
      sucio = true; // con sensores la escena se mueve sola
    }
    const camaraSeMovio = controles.update(); // true mientras el usuario (o la inercia) mueve la cámara
    if (sucio || camaraSeMovio) {
      sucio = false;
      renderer.render(escena, camara);
    }
  }
  bucle();

  // ── Sesiones 38-39: modo AR ─────────────────────────────────────────────
  let sesionAR: XRSession | null = null;

  async function entrarEnAR(sesion: XRSession, opciones: OpcionesAR): Promise<EstadoAR> {
    anotar("entrada");
    cancelAnimationFrame(animacion); // en AR NO manda requestAnimationFrame: manda el reloj del visor XR
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(sesion);
    sesionAR = sesion;

    const caps = capacidadesDe(sesion);
    const fondoPrevio = escena.background;
    escena.background = null; // la cámara real es el fondo: no se pinta nada detrás
    controles.enabled = false;
    if (modelo) modelo.raiz.position.y = 0; // en AR el modelo apoya su BASE en la superficie

    // ── Estado de la colocación ──
    let fase: FaseAR = caps.hitTest ? "buscando" : "colocado";
    let ancla: XRAnchor | null = null;
    let escala = ESCALA_INICIAL;
    let consultas = 0;
    let resultados = 0;
    let impactosVistos = 0;
    let sinSuperficie = false;
    let ultimaPose = performance.now(); // cuándo fue la última vez que el hit-test encontró algo
    let ultimoImpacto: XRRigidTransform | null = null; // pose de la superficie bajo el centro de la pantalla

    const estado = (): EstadoAR => {
      raiz.updateMatrixWorld(true);
      const p = grupo.getWorldPosition(new THREE.Vector3());
      return {
        ...caps,
        fase,
        anclado: ancla !== null,
        escala,
        giroGrados: ((aGrados(grupo.rotation.y) % 360) + 360) % 360,
        posicion: { x: p.x, y: p.y, z: p.z },
        consultas,
        resultados,
        impactos: impactosVistos,
        sinSuperficie,
      };
    };
    const avisar = () => opciones.alCambiar(estado());

    // `raiz` deja de calcular su matriz sola: se la damos nosotros desde la superficie o el ancla.
    raiz.matrixAutoUpdate = false;
    grupo.position.set(0, MITAD * escala, 0); // la base apoya en la superficie
    grupo.scale.setScalar(escala);
    grupo.rotation.set(0, 0, 0);

    // Retícula: un anillo verde que se pega a la superficie que el hit-test encuentra.
    const reticula = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 40).rotateX(-Math.PI / 2), // acostado: su cara mira hacia arriba
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    reticula.matrixAutoUpdate = false; // su matriz viene entera del hit-test
    reticula.visible = false;
    escena.add(reticula);

    // Sin hit-test no hay superficie que buscar: el cubo se coloca delante, como en la Sesión 38.
    if (fase === "colocado") {
      raiz.matrix.makeTranslation(0, -0.5, -1.5);
    } else {
      raiz.visible = false; // hasta que el usuario toque, solo se ve la retícula
    }

    // ── Hit-test: un rayo desde el centro de la pantalla («viewer») ──
    let fuente: XRHitTestSource | null = null;
    if (caps.hitTest) {
      try {
        const espacioViewer = await sesion.requestReferenceSpace("viewer");
        try {
          // «plane» exige que el sistema haya reconocido un plano (tarda y falla en superficies lisas);
          // «point» acepta también puntos de característica sueltos: el anillo sale casi de inmediato.
          fuente = (await sesion.requestHitTestSource?.({ space: espacioViewer, entityTypes: ["plane", "point"] })) ?? null;
        } catch {
          fuente = (await sesion.requestHitTestSource?.({ space: espacioViewer })) ?? null; // el navegador no admite «point»
        }
      } catch {
        fuente = null;
      }
      if (!fuente) {
        caps.hitTest = false; // lo concedió pero no funciona: plan B
        fase = "colocado";
        raiz.visible = true;
        raiz.matrix.makeTranslation(0, -0.5, -1.5);
      }
    }

    // ── Colocar al tocar ──
    let turno = 0; // numera los toques: si llegan dos seguidos, solo vale el último
    async function colocar(frame: XRFrame) {
      const referencia = renderer.xr.getReferenceSpace();
      if (!referencia) return;
      const mio = ++turno;
      let impacto: XRRigidTransform | null = null;
      const hayImpacto = fuente !== null && reticula.visible && ultimoImpacto !== null;
      if (fuente && !hayImpacto && !sinSuperficie) return; // no hay superficie: no se coloca en el aire (todavía)
      if (hayImpacto) {
        impacto = ultimoImpacto;
        raiz.matrix.copy(reticula.matrix); // el cubo aparece donde está la retícula
      } else {
        // Plan B (sin hit-test, o sin superficie tras varios segundos): delante de la mirada actual, a 1,5 m.
        const posicion = new THREE.Vector3().setFromMatrixPosition(camara.matrixWorld);
        const delante = camara.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
        posicion.addScaledVector(delante, 1.5);
        posicion.y -= 0.5;
        raiz.matrix.makeTranslation(posicion.x, posicion.y, posicion.z);
      }
      grupo.position.set(0, MITAD * escala, 0); // vuelve al centro de la nueva posición
      raiz.visible = true;
      fase = "colocado";
      // ── Ancla: el sistema recuerda ESE punto del mundo real y lo sigue corrigiendo ──
      ancla?.delete(); // al volver a colocar, la ancla anterior ya no sirve
      ancla = null;
      avisar();
      if (impacto && caps.anclas) {
        try {
          const nueva = await frame.createAnchor!(impacto, referencia);
          if (mio !== turno || !sesionAR) nueva.delete(); // llegó tarde: otro toque o la sesión ya terminó
          else ancla = nueva;
        } catch {
          ancla = null; // el navegador rechazó anclar: el objeto queda fijo en el espacio «local»
        }
        avisar();
      }
    }

    // ── Gestos: mover (un dedo), girar y escalar (dos dedos) ──
    const rayo = new THREE.Raycaster();
    const plano = new THREE.Plane();
    const desfase = new THREE.Vector2();
    const tmp = new THREE.Vector3();
    function mover(clientX: number, clientY: number, primero: boolean) {
      if (fase !== "colocado") return;
      // Pantalla → rayo → punto donde ese rayo corta el plano de la superficie.
      rayo.setFromCamera(new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1), camara);
      raiz.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(raiz.matrixWorld);
      plano.setFromNormalAndCoplanarPoint(normal, tmp.setFromMatrixPosition(raiz.matrixWorld));
      const punto = rayo.ray.intersectPlane(plano, new THREE.Vector3());
      if (!punto) return; // el rayo no baja hasta el plano (miras al cielo)
      const local = raiz.worldToLocal(punto);
      // En el primer movimiento se recuerda a cuánto del centro del objeto tocó el dedo, para que no salte.
      if (primero) desfase.set(grupo.position.x - local.x, grupo.position.z - local.z);
      grupo.position.x = local.x + desfase.x;
      grupo.position.z = local.z + desfase.y;
      avisar();
    }
    const gestos = crearGestos(opciones.overlay, {
      alMover: mover,
      alGirar(rad) {
        if (fase !== "colocado") return;
        grupo.rotation.y += rad;
        avisar();
      },
      alEscalar(factor) {
        if (fase !== "colocado") return;
        escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala * factor));
        grupo.scale.setScalar(escala);
        grupo.position.y = MITAD * escala; // la base sigue apoyada
        avisar();
      },
    });

    sesion.addEventListener("select", (ev) => {
      if (gestos.huboGesto()) return; // un arrastre no cuenta como «tocar para colocar»
      void colocar((ev as XRInputSourceEvent).frame);
    });

    // ── Bucle: cada fotograma XR ──
    let cuadro = 0; // cuenta fotogramas para consultar el hit-test solo uno de cada dos
    let sinImpacto = 0; // consultas seguidas sin superficie
    renderer.setAnimationLoop((_t, frame) => {
      const referencia = renderer.xr.getReferenceSpace();
      if (frame && referencia) {
        if (fuente && cuadro++ % CADA_CUANTOS_FOTOGRAMAS === 0) {
          const impactos = frame.getHitTestResults(fuente);
          const pose = impactos.length ? impactos[0].getPose(referencia) : null;
          consultas++;
          if (impactos.length) resultados++;
          if (pose) impactosVistos++;
          if (consultas % 30 === 0) avisar(); // refresca el diagnóstico (el overlay lo limita a 5 veces por segundo)
          if (pose) {
            sinImpacto = 0;
            sinSuperficie = false;
            ultimaPose = performance.now();
            reticula.visible = true;
            reticula.matrix.fromArray(pose.transform.matrix);
            ultimoImpacto = pose.transform;
            if (fase === "buscando") {
              fase = "listo";
              avisar();
            }
          } else if (++sinImpacto >= CONSULTAS_SIN_IMPACTO) {
            // Una superficie que aparece y desaparece cada fotograma haría parpadear el texto del overlay.
            reticula.visible = false;
            ultimoImpacto = null;
            if (fase === "listo") {
              fase = "buscando";
              avisar();
            }
          }
          if (!pose && fase === "buscando" && !sinSuperficie && performance.now() - ultimaPose > MS_HASTA_PLAN_B) {
            sinSuperficie = true; // el texto de ayuda cambia y el toque ya coloca
            avisar();
          }
        }
        // Con ancla, la posición de `raiz` la corrige el sistema fotograma a fotograma.
        if (ancla && frame.trackedAnchors?.has(ancla)) {
          const poseAncla = frame.getPose(ancla.anchorSpace, referencia);
          if (poseAncla) raiz.matrix.fromArray(poseAncla.transform.matrix);
        }
      }
      renderer.render(escena, camara);
    });

    anotar("activa");
    sesion.addEventListener(
      "end",
      () => {
        // Cada paso se anota ANTES de hacerlo: si la pestaña muere, el último nombre dice dónde.
        anotar("fin-1-bucle");
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        sesionAR = null;
        gestos.destruir();
        anotar("fin-2-fuente");
        try { fuente?.cancel(); } catch { /* la sesión ya terminó */ }
        anotar("fin-3-ancla");
        try { ancla?.delete(); } catch { /* idem */ }
        anotar("fin-4-escena");
        escena.remove(reticula);
        reticula.geometry.dispose();
        (reticula.material as THREE.Material).dispose();
        escena.background = fondoPrevio;
        controles.enabled = !porSensores;
        raiz.matrixAutoUpdate = true;
        raiz.matrix.identity();
        raiz.visible = true;
        grupo.position.set(0, 0, 0);
        grupo.scale.setScalar(ESCALA_VISTA);
        if (modelo) modelo.raiz.position.y = -centroY;
        grupo.rotation.set(0, 0, 0);
        opciones.alTerminar();
        // El primer fotograma normal NO se dibuja en el mismo instante en que el navegador desmonta
        // la cámara y el visor XR: se espera un momento para que termine de soltar sus recursos.
        anotar("fin-5-espera");
        window.setTimeout(() => {
          anotar("fin-6-tamano");
          ajustarTamano(); // el visor XR cambió el tamaño del canvas
          anotar("fin-7-bucle");
          sucio = true; // el lienzo se vació al salir de AR: hay que dibujar de nuevo
          bucle(); // vuelve el requestAnimationFrame normal
          anotar(PASO_FINAL);
        }, 250);
      },
      { once: true }
    );

    avisar();
    return estado();
  }

  // ── Sesión 40: elegir una pieza tocándola (solo fuera de AR) ──
  const rayoToque = new THREE.Raycaster();
  let avisarToque: ((id: string | null) => void) | null = null;
  let inicioToque: { x: number; y: number; t: number } | null = null;
  const lienzo = renderer.domElement;
  const alPulsar = (ev: PointerEvent) => {
    inicioToque = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  };
  const alSoltar = (ev: PointerEvent) => {
    const ini = inicioToque;
    inicioToque = null;
    // Un arrastre (girar la vista) no es un toque: se mide cuánto se movió el dedo.
    if (!ini || sesionAR || !modelo) return;
    if (Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) > 8 || performance.now() - ini.t > 600) return;
    const caja = lienzo.getBoundingClientRect();
    rayoToque.setFromCamera(new THREE.Vector2(((ev.clientX - caja.left) / caja.width) * 2 - 1, -((ev.clientY - caja.top) / caja.height) * 2 + 1), camara);
    const impactos = rayoToque.intersectObjects([...modelo.piezas.values()], false);
    const id = (impactos[0]?.object.userData.piezaId as string | undefined) ?? null;
    seleccionar(id === piezaElegida ? null : id); // volver a tocar la misma pieza la suelta
    avisarToque?.(piezaElegida);
  };
  lienzo.addEventListener("pointerdown", alPulsar);
  lienzo.addEventListener("pointerup", alSoltar);

  function seleccionar(id: string | null) {
    piezaElegida = id;
    modelo?.resaltar(id);
    sucio = true;
  }

  function mostrarModelo(def: DefinicionModelo) {
    if (modelo) {
      grupo.remove(modelo.raiz);
      modelo.destruir();
    }
    modelo = construirModelo(def);
    sucio = true;
    grupo.add(modelo.raiz);
    centroY = modelo.centroY;
    piezaElegida = null;
    if (!sesionAR) {
      modelo.raiz.position.y = -centroY; // en la vista normal el modelo gira alrededor de su centro; en AR, apoyado por la base
      grupo.rotation.set(0, 0, 0);
      const elev = ((def.elevacion ?? 30) * Math.PI) / 180;
      const dist = DISTANCIA_VISTA * (def.distancia ?? 1);
      camara.position.set(0, dist * Math.sin(elev), dist * Math.cos(elev));
      controles.target.set(0, 0, 0);
      controles.update();
    }
  }

  const aGrados = (r: number) => Math.round((r * 180) / Math.PI);
  return {
    mostrarModelo,
    seleccionar,
    alTocarPieza(avisar) {
      avisarToque = avisar;
    },
    rotarHacia(x, y) {
      objetivoX = x;
      objetivoY = y;
    },
    controlPorSensores(activo) {
      porSensores = activo;
      sucio = true;
      controles.enabled = !activo;
      if (!activo) grupo.rotation.set(0, 0, 0);
    },
    rotacionActualGrados() {
      return { x: aGrados(grupo.rotation.x), y: aGrados(grupo.rotation.y) };
    },
    fondoTransparente(activo) {
      escena.background = activo ? null : COLOR_FONDO;
      sucio = true;
    },
    entrarEnAR,
    enAR() {
      return sesionAR !== null;
    },
    destruir() {
      cancelAnimationFrame(animacion);
      void sesionAR?.end();
      window.removeEventListener("resize", ajustarTamano);
      controles.dispose();
      lienzo.removeEventListener("pointerdown", alPulsar);
      lienzo.removeEventListener("pointerup", alSoltar);
      modelo?.destruir();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

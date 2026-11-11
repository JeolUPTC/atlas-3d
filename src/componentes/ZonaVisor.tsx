// ZonaVisor — Sesión 43. La barra de botones, el lienzo 3D, el panel del modelo y el estado de la AR.
// Aquí está la frontera entre React y Three.js: React dibuja los botones y los textos;
// el <div id="visor"> lo entrega VACÍO al visor, que es dueño de lo que hay dentro (el <canvas>).
import type { RefObject } from "react";
import type { ReactNode } from "react";

interface Props {
  contenedor: RefObject<HTMLDivElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  aviso: string;
  sensores: { activo: boolean; lectura: string; alternar: () => void; calibrar: () => void };
  camara: { activa: boolean; alternar: () => void };
  ar: {
    puedeEntrar: boolean;
    estado: string;
    diagnostico: string;
    diagAbierto: boolean;
    setDiagAbierto: (abierto: boolean) => void;
    entrar: () => void;
    comprobar: () => void;
  };
  children: ReactNode; // el panel del modelo
}

export function ZonaVisor({ contenedor, video, aviso, sensores, camara, ar, children }: Props) {
  return (
    <section className="visor-zona">
      <div className="visor-barra">
        <button type="button" id="btn-orientacion" onClick={sensores.alternar}>
          {sensores.activo ? "📱 Sensores: ACTIVOS (toca para apagar)" : "📱 Rotar con el teléfono"}
        </button>
        <button type="button" id="btn-calibrar" disabled={!sensores.activo} onClick={sensores.calibrar}>Calibrar</button>
        <button type="button" id="btn-camara" onClick={camara.alternar}>
          {camara.activa ? "📷 Cámara: ACTIVA (toca para apagar)" : "📷 Cámara de fondo"}
        </button>
        <button type="button" id="btn-ar" disabled={!ar.puedeEntrar} onClick={ar.entrar}>🥽 Ver en AR</button>
        <span id="lectura-visor" className="lectura-visor">{sensores.lectura}</span>
      </div>
      <p id="aviso-visor" className="aviso-visor" role="status" hidden={!aviso}>{aviso}</p>
      <div id="visor" className="visor" ref={contenedor}>
        <video id="fondo-camara" className="fondo-camara" playsInline muted hidden={!camara.activa} ref={video} />
      </div>
      {children}
      <p id="estado-ar" className="estado-ar" role="status">{ar.estado}</p>
      <details className="diag-ar" open={ar.diagAbierto} onToggle={(e) => ar.setDiagAbierto(e.currentTarget.open)}>
        <summary>Diagnóstico de realidad aumentada</summary>
        <pre id="diag-ar" className="diag-ar-texto">{ar.diagnostico}</pre>
        <button type="button" id="btn-recomprobar" onClick={ar.comprobar}>Comprobar de nuevo</button>
      </details>
      <p className="aviso-demo">Toca una pieza para ver qué hace; arrastra para girar la vista. Con la cámara de fondo NO es realidad aumentada: el modelo solo se dibuja encima del video. El botón «Ver en AR» abre una sesión WebXR real: el anillo verde busca una superficie, tocas para apoyar el modelo y lo mueves, giras y escalas con los dedos; con ◀ ▶ recorres sus piezas.</p>
    </section>
  );
}

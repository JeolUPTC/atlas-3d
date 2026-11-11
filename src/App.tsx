// App — Sesión 43. El Atlas 3D, ahora como árbol de componentes.
// Lo que NO cambió: visor.ts (Three.js y WebXR), xr.ts, sw.ts, db.ts, crypto.ts, los modelos y el manifest.
// Lo que cambió: main.ts (649 líneas de querySelector y addEventListener) se reparte en hooks y componentes.
import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { crearVisor, type Visor } from "./visor";
import { CATALOGO } from "./modelos";
import { mostrarAviso } from "./avisos";
import { useConexion } from "./hooks/useConexion";
import { useProgreso } from "./hooks/useProgreso";
import { usePanel } from "./hooks/usePanel";
import { useSensores } from "./hooks/useSensores";
import { useCamara } from "./hooks/useCamara";
import { useAR } from "./hooks/useAR";
import { ZonaVisor } from "./componentes/ZonaVisor";
import { PanelModelo } from "./componentes/PanelModelo";
import { ZonaInstalar } from "./componentes/ZonaInstalar";
import { ZonaDescargas } from "./componentes/ZonaDescargas";
import { OverlayAR } from "./componentes/OverlayAR";
import { Catalogo } from "./componentes/Catalogo";

const MODELOS = CATALOGO.map((m) => ({ id: m.id, nombre: m.nombre, resumen: m.resumen }));
const MODELOS_IDS = MODELOS.map((m) => m.id);

export function App() {
  const textoConexion = useConexion();
  const progreso = useProgreso();

  // ── El visor: un objeto de Three.js que vive fuera de React ──────────────
  const contenedor = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [visor, setVisor] = useState<Visor | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const nuevo = crearVisor(contenedor.current!);
    setVisor(nuevo);
    return () => {
      nuevo.destruir(); // la limpieza: sin ella, StrictMode dejaría dos lienzos
      setVisor(null);
    };
  }, []);

  const panel = usePanel(visor);
  const sensores = useSensores(visor, setAviso);
  const camara = useCamara(visor, video, setAviso);
  const ar = useAR({
    visor,
    overlay,
    avisar: setAviso,
    antesDeEntrar: () => {
      camara.apagar();
      sensores.apagar();
    },
  });

  // ── El Service Worker (virtual:pwa-register/react) ───────────────────────
  const { offlineReady } = useRegisterSW({
    immediate: true,
    onOfflineReady() {
      // El usuario está mirando la pantalla: la notificación solo si NO la está mirando.
      if (document.visibilityState !== "visible") {
        void mostrarAviso("Atlas 3D listo", "Ya funciona sin conexión.", import.meta.env.BASE_URL, "atlas-offline");
      }
    },
    onRegisterError(error) {
      console.error("Error al registrar el SW de Workbox:", error);
    },
  });

  // appinstalled se dispara cuando el usuario instala la PWA.
  useEffect(() => {
    const alInstalar = () => void mostrarAviso("Atlas 3D instalado", "Ya puedes abrirlo desde tu pantalla de inicio.", import.meta.env.BASE_URL, "atlas-instalado");
    window.addEventListener("appinstalled", alInstalar);
    return () => window.removeEventListener("appinstalled", alInstalar);
  }, []);

  const pieza = panel.def.piezas.find((p) => p.id === panel.piezaId);
  const extra = pieza ? panel.ficha?.piezas[pieza.id] : null;
  const textoPieza = pieza ? `${pieza.nombre}: ${extra ? extra.responsabilidad : pieza.resumen}` : `${panel.def.nombre}. Usa ◀ ▶ para recorrer sus piezas.`;

  return (
    <>
      <p id="estado-conexion" className="estado-conexion" role="status" hidden={textoConexion === null}>{textoConexion}</p>
      <main className="contenido">
        <ZonaVisor contenedor={contenedor} video={video} aviso={aviso} sensores={sensores} camara={camara} ar={ar}>
          <PanelModelo def={panel.def} piezaId={panel.piezaId} ficha={panel.ficha} alElegirModelo={panel.elegirModelo} alElegirPieza={panel.elegirPieza} />
        </ZonaVisor>
        <ZonaInstalar />
        <ZonaDescargas ids={MODELOS_IDS} dbPromesa={progreso.dbPromesa} alCambiarDescargas={progreso.recargar} appLista={offlineReady[0]} />
      </main>
      <OverlayAR raiz={overlay} ayuda={ar.textos.ayuda} datos={ar.textos.datos} pieza={textoPieza} alRecorrer={panel.recorrerPiezas} alSalir={ar.salir} />
      <div id="app">
        <Catalogo
          modelos={MODELOS}
          progreso={progreso.progreso}
          descargados={progreso.descargados}
          ver3D={(id) => {
            panel.elegirModelo(id);
            document.querySelector("#visor")?.scrollIntoView({ block: "center", behavior: "smooth" });
          }}
          marcarVisto={progreso.marcarVisto}
          alternarFavorito={progreso.alternarFavorito}
          guardarNota={progreso.guardarNota}
          verNota={progreso.verNota}
        />
      </div>
    </>
  );
}

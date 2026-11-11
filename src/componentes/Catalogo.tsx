// Catalogo — Sesión 43. Las tarjetas con favoritos, «visto» y nota de estudio cifrada (Sesiones 33-34).
// Antes, cada acción terminaba en render(): borrar todo y reescribirlo. Ahora cada tarjeta es un
// componente con su propio estado (la nota que escribes) y React cambia solo lo que cambió.
import { useEffect, useState } from "react";
import type { ProgresoModelo } from "../db";

interface Modelo { id: string; nombre: string; resumen: string }

interface Acciones {
  ver3D: (id: string) => void;
  marcarVisto: (id: string) => Promise<void>;
  alternarFavorito: (id: string) => Promise<void>;
  guardarNota: (id: string, texto: string) => Promise<boolean>;
  verNota: (id: string) => Promise<void>;
}

interface TarjetaProps extends Acciones {
  modelo: Modelo;
  progreso?: ProgresoModelo;
  descargado: boolean;
  destacada: boolean;
}

function Tarjeta({ modelo, progreso, descargado, destacada, ver3D, marcarVisto, alternarFavorito, guardarNota, verNota }: TarjetaProps) {
  const [nota, setNota] = useState("");
  const ultimaVisita = progreso?.ultimaVisita ? new Date(progreso.ultimaVisita).toLocaleString() : "nunca";

  // Una notificación puede abrir la app con ?modelo=ID para destacar esa ficha (Sesión 37).
  useEffect(() => {
    if (destacada) document.getElementById(`tarjeta-${modelo.id}`)?.scrollIntoView({ block: "center" });
  }, [destacada, modelo.id]);

  async function guardar() {
    if (!nota.trim()) return;
    if (await guardarNota(modelo.id, nota)) setNota("");
  }

  return (
    <article id={`tarjeta-${modelo.id}`} className={destacada ? "modelo-card destacada" : "modelo-card"} data-id={modelo.id}>
      <h2>{modelo.nombre}</h2>
      <p className="resumen-card">{modelo.resumen}</p>
      <p className="meta">
        Última visita: {ultimaVisita}
        {descargado && <> · <span className="disponible">✓ disponible sin conexión</span></>}
      </p>
      <div className="acciones">
        <button className="btn-ver3d" data-id={modelo.id} onClick={() => ver3D(modelo.id)}>🧊 Ver en 3D</button>
        <button className="btn-visitar" data-id={modelo.id} onClick={() => void marcarVisto(modelo.id)}>Marcar como visto</button>
        <button className="btn-favorito" data-id={modelo.id} onClick={() => void alternarFavorito(modelo.id)}>
          {progreso?.favorito ? "★ Favorito" : "☆ Marcar favorito"}
        </button>
      </div>
      <div className="nota-zona">
        <input type="text" className="nota-input" placeholder="Nota de estudio..." value={nota} onChange={(e) => setNota(e.target.value)} />
        <button className="btn-guardar-nota" data-id={modelo.id} onClick={() => void guardar()}>🔒 Guardar nota</button>
        <button className="btn-ver-nota" data-id={modelo.id} disabled={!progreso?.notaCifrada} onClick={() => void verNota(modelo.id)}>👁 Ver nota</button>
      </div>
    </article>
  );
}

interface Props extends Acciones {
  modelos: Modelo[];
  progreso: Map<string, ProgresoModelo>;
  descargados: Set<string>;
}

export function Catalogo({ modelos, progreso, descargados, ...acciones }: Props) {
  const destacado = new URLSearchParams(location.search).get("modelo");
  return (
    <div className="atlas-demo">
      <h1>Atlas 3D de Arquitectura de Software</h1>
      <p className="aviso-demo">
        Marca cada modelo como visto, guárdalo como favorito o escribe una nota de estudio (se cifra en tu dispositivo).
      </p>
      <div className="modelos-grid">
        {modelos.map((m) => (
          <Tarjeta key={m.id} modelo={m} progreso={progreso.get(m.id)} descargado={descargados.has(m.id)} destacada={destacado === m.id} {...acciones} />
        ))}
      </div>
    </div>
  );
}

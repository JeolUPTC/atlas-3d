// PanelModelo — Sesión 43. Pestañas, resumen, leyenda, piezas y detalle del modelo elegido.
// En la Sesión 40 esto eran ~60 líneas de innerHTML, querySelectorAll y addEventListener;
// aquí es una función de (modelo, pieza, ficha) → pantalla. No hay nada que sincronizar a mano.
import { CATALOGO } from "../modelos";
import { ROLES, type DefinicionModelo, type Ficha } from "../modelos/tipos";

interface Props {
  def: DefinicionModelo;
  piezaId: string | null;
  ficha: Ficha | null;
  alElegirModelo: (id: string) => void;
  alElegirPieza: (id: string | null) => void;
}

function nombresDe(def: DefinicionModelo, ids: string[]): string {
  return ids.map((x) => def.piezas.find((p) => p.id === x)?.nombre ?? x).join(", ");
}

export function PanelModelo({ def, piezaId, ficha, alElegirModelo, alElegirPieza }: Props) {
  const roles = [...new Set(def.piezas.map((p) => p.rol))];
  const pieza = def.piezas.find((p) => p.id === piezaId);
  const extra = pieza ? ficha?.piezas[pieza.id] : null;
  const sinFicha = ficha ? null : (
    <p className="nota-ficha">Detalle ampliado no disponible: descarga las fichas (abajo) para leerlo sin conexión.</p>
  );

  return (
    <section className="modelo-panel" aria-label="Modelo de arquitectura">
      <div className="modelo-tabs" id="tabs-modelo" role="group" aria-label="Elegir modelo">
        {CATALOGO.map((m) => (
          <button key={m.id} type="button" className="tab" data-id={m.id} aria-pressed={m.id === def.id} onClick={() => alElegirModelo(m.id)}>
            {m.nombre}
          </button>
        ))}
      </div>
      <p id="modelo-resumen" className="modelo-resumen">{def.resumen}</p>
      <div id="leyenda" className="leyenda" aria-label="Leyenda de colores">
        {roles.map((r) => (
          <span key={r} className="leyenda-item"><i style={{ background: ROLES[r].css }} />{ROLES[r].nombre}</span>
        ))}
      </div>
      <div id="chips-piezas" className="chips" role="group" aria-label="Piezas del modelo">
        {def.piezas.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            data-id={p.id}
            aria-pressed={p.id === piezaId}
            onClick={() => alElegirPieza(piezaId === p.id ? null : p.id)}
          >
            <i style={{ background: ROLES[p.rol].css }} />{p.nombre}
          </button>
        ))}
      </div>
      <div id="pieza-detalle" className="pieza-detalle" aria-live="polite">
        {pieza ? (
          <>
            <h3><i style={{ background: ROLES[pieza.rol].css }} />{pieza.nombre} <small>{ROLES[pieza.rol].nombre}</small></h3>
            <p>{pieza.resumen}</p>
            {extra ? (
              <>
                <p><b>Responsabilidad.</b> {extra.responsabilidad}</p>
                <p><b>Habla con:</b> {nombresDe(def, extra.habla_con)}.</p>
              </>
            ) : sinFicha}
          </>
        ) : (
          <>
            <p>Toca una pieza del modelo, o elígela en la lista, para ver qué hace. Toca la misma pieza otra vez para soltarla.</p>
            {ficha ? (
              <>
                <p><b>Cuándo usarlo.</b> {ficha.cuando_usarlo}</p>
                <p><b>Riesgo.</b> {ficha.riesgo}</p>
              </>
            ) : sinFicha}
          </>
        )}
      </div>
    </section>
  );
}

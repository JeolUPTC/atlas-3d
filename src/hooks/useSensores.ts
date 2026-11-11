// useSensores — Sesión 43. Rotar el modelo con la inclinación del teléfono (Sesión 35).
import { useCallback, useEffect, useRef, useState } from "react";
import type { Visor } from "../visor";
import { hayOrientacionReal, iniciarControlOrientacion, pedirPermisoOrientacion, type ControlOrientacion } from "../sensores";

export function useSensores(visor: Visor | null, avisar: (texto: string) => void) {
  const control = useRef<ControlOrientacion | null>(null);
  const [activo, setActivo] = useState(false);
  const [lectura, setLectura] = useState("");

  const apagar = useCallback(() => {
    control.current?.detener();
    control.current = null;
    visor?.controlPorSensores(false);
    setActivo(false);
    setLectura("");
  }, [visor]);

  // Mientras los sensores están activos, la lectura en pantalla se refresca cada 150 ms.
  useEffect(() => {
    if (!activo || !visor) return;
    const t = window.setInterval(() => {
      const { x, y } = visor.rotacionActualGrados();
      setLectura(`rotación X ${x}° · Y ${y}°`);
    }, 150);
    return () => window.clearInterval(t);
  }, [activo, visor]);

  // Si el componente se desmonta con los sensores activos, se sueltan.
  useEffect(() => () => control.current?.detener(), []);

  async function alternar() {
    if (!visor) return;
    if (control.current) {
      apagar(); // segundo clic: volver al control manual
      return;
    }
    const permiso = await pedirPermisoOrientacion();
    if (permiso === "denied") {
      avisar("Denegaste el acceso a los sensores. Sigue disponible el control con ratón o dedo.");
      return;
    }
    if (permiso === "no-soportado" || !(await hayOrientacionReal())) {
      avisar("Este dispositivo no tiene sensores de orientación. Usa el ratón o el dedo para girar el visor.");
      return;
    }
    avisar("");
    visor.controlPorSensores(true);
    control.current = iniciarControlOrientacion((x, y) => visor.rotarHacia(x, y));
    setActivo(true);
  }

  return { activo, lectura, alternar, apagar, calibrar: () => control.current?.calibrar() };
}

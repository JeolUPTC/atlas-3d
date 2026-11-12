// db.ts — envoltorio en promesas de IndexedDB para el progreso del Atlas 3D.
// Mismo patrón de la Sesión 22 (Gestor de Tareas), reescrito aquí con los
// nombres reales del Atlas 3D — sin cambiar cómo funciona por dentro.
// Sesión 33, sección 2 y 3.
const NOMBRE_DB = "atlas3d-progreso-db";
// Versión 2 (Sesión 37): se agrega el almacén "descargas" (cola de modelos para usar sin conexión).
// Versión 3 (Sesión 40): los modelos de prueba (modelo-demo-1..3) pasan a tener nombre real
// (mvc, capas, microservicios). La migración RENOMBRA los registros para no perder favoritos ni notas.
const VERSION_DB = 3;
/** Sesión 40: correspondencia entre los identificadores viejos y los nuevos. */
export const RENOMBRES_V3 = {
    "modelo-demo-1": "mvc",
    "modelo-demo-2": "capas",
    "modelo-demo-3": "microservicios",
};
/** Reescribe los registros con identificador viejo. En «descargas» vuelven a «pendiente»: la caché de modelos aún no tiene los archivos nuevos. */
function migrarIdentificadores(store, reiniciarDescarga) {
    for (const [viejo, nuevo] of Object.entries(RENOMBRES_V3)) {
        const lectura = store.get(viejo);
        lectura.onsuccess = () => {
            const registro = lectura.result;
            if (!registro)
                return;
            store.delete(viejo);
            store.put({ ...registro, modeloId: nuevo, ...(reiniciarDescarga ? { estado: "pendiente" } : {}) });
        };
    }
}
/** Abre (o crea) la base de datos de progreso. */
export function abrirBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);
        peticion.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Migración por tramos (Sesión 22/26): quien viene de la v1 conserva su
            // progreso y solo recibe lo nuevo.
            if (event.oldVersion < 1) {
                const store = db.createObjectStore("progreso", { keyPath: "modeloId" });
                store.createIndex("porFavorito", "favorito", { unique: false });
                store.createIndex("porUltimaVisita", "ultimaVisita", { unique: false });
            }
            if (event.oldVersion < 2) {
                db.createObjectStore("descargas", { keyPath: "modeloId" });
            }
            if (event.oldVersion >= 1 && event.oldVersion < 3) {
                // La clave de un registro no se puede cambiar: se lee cada registro viejo, se escribe
                // con la clave nueva y se borra el viejo, todo dentro de la transacción de la migración.
                const tx = event.target.transaction;
                migrarIdentificadores(tx.objectStore("progreso"), false);
                migrarIdentificadores(tx.objectStore("descargas"), true);
            }
        };
        peticion.onsuccess = (event) => {
            const db = event.target.result;
            db.onversionchange = () => db.close(); // no bloquear futuras migraciones desde otra pestaña
            resolve(db);
        };
        peticion.onerror = (event) => reject(event.target.error);
    });
}
/** Marca un modelo como visitado ahora. put(): crea o actualiza, nunca falla por clave repetida. */
export function marcarModeloVisto(db, modeloId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("progreso", "readwrite");
        const store = tx.objectStore("progreso");
        const peticion = store.get(modeloId);
        peticion.onsuccess = () => {
            const registro = peticion.result || { modeloId, favorito: false, ultimaVisita: null, notaCifrada: null, notaIv: null };
            registro.ultimaVisita = Date.now();
            const escritura = store.put(registro);
            escritura.onsuccess = () => resolve(registro);
            escritura.onerror = () => reject(escritura.error);
        };
        peticion.onerror = () => reject(peticion.error);
    });
}
/** Alterna el favorito de un modelo. Devuelve el nuevo estado. */
export function alternarFavorito(db, modeloId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("progreso", "readwrite");
        const store = tx.objectStore("progreso");
        const peticion = store.get(modeloId);
        peticion.onsuccess = () => {
            const registro = peticion.result || { modeloId, favorito: false, ultimaVisita: null, notaCifrada: null, notaIv: null };
            registro.favorito = !registro.favorito;
            const escritura = store.put(registro);
            escritura.onsuccess = () => resolve(registro.favorito);
            escritura.onerror = () => reject(escritura.error);
        };
        peticion.onerror = () => reject(peticion.error);
    });
}
/** Trae todos los registros de progreso (para pintar el estado inicial de la demo). */
export function obtenerTodoElProgreso(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("progreso", "readonly");
        const peticion = tx.objectStore("progreso").getAll();
        peticion.onsuccess = () => resolve(peticion.result);
        peticion.onerror = () => reject(peticion.error);
    });
}
/** Recorre con un cursor, por el índice porFavorito, los modelos marcados como favoritos. */
export function obtenerFavoritos(db) {
    return new Promise((resolve) => {
        const resultado = [];
        const indice = db.transaction("progreso", "readonly").objectStore("progreso").index("porFavorito");
        const cursor = indice.openCursor(IDBKeyRange.only(true));
        cursor.onsuccess = (event) => {
            const c = event.target.result;
            if (c) {
                resultado.push(c.value);
                c.continue();
            }
            else {
                resolve(resultado);
            }
        };
    });
}
/** Guarda (cifrada) la nota de estudio de un modelo. Sesión 33, sección 4. */
export async function guardarNotaDeEstudio(db, clave, modeloId, texto, cifrarTexto) {
    const { cifrado, iv } = await cifrarTexto(clave, texto);
    const tx = db.transaction("progreso", "readwrite");
    const store = tx.objectStore("progreso");
    const existente = await new Promise((resolve) => {
        store.get(modeloId).onsuccess = (e) => resolve(e.target.result);
    });
    const registro = existente || { modeloId, favorito: false, ultimaVisita: null, notaCifrada: null, notaIv: null };
    registro.notaCifrada = cifrado;
    registro.notaIv = iv;
    return new Promise((resolve, reject) => {
        const escritura = store.put(registro);
        escritura.onsuccess = () => resolve();
        escritura.onerror = () => reject(escritura.error);
    });
}
/** Anota (o reinicia a «pendiente») la descarga de varios modelos. */
export function encolarDescargas(db, ids) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("descargas", "readwrite");
        const store = tx.objectStore("descargas");
        ids.forEach((modeloId) => store.put({ modeloId, estado: "pendiente" }));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export function obtenerDescargas(db) {
    return new Promise((resolve, reject) => {
        const peticion = db.transaction("descargas", "readonly").objectStore("descargas").getAll();
        peticion.onsuccess = () => resolve(peticion.result);
        peticion.onerror = () => reject(peticion.error);
    });
}
export function marcarDescargaLista(db, modeloId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("descargas", "readwrite");
        tx.objectStore("descargas").put({ modeloId, estado: "listo" });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

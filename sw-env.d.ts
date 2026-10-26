// Solo para compilar src/sw.ts: Vite reemplaza import.meta.env.BASE_URL al empaquetar.
interface ImportMeta {
  readonly env: { readonly BASE_URL: string };
}

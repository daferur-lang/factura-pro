# Facturas Pro

PWA minimalista de **presupuestos y facturas para autónomos**. Sin contabilidad compleja, sin backend, lista para monetizar.

## Funciones

- **Crear presupuesto** — líneas dinámicas, IVA configurable (0/10/21%), totales en tiempo real.
- **Convertir a factura** — un clic, numeración correlativa automática (`F-AAAA-001`).
- **Exportar PDF** — plantilla profesional generada con jsPDF.
- **Estados** — Borrador → Enviado → Aceptado → Rechazado → Pagado.
- **Freemium** — 3 documentos/mes gratis, marca de agua en el PDF, modal de upgrade (listo para conectar Stripe/LemonSqueezy).
- **PWA** — instalable y funcional offline mediante service worker.

## Stack

HTML + CSS + JavaScript vanilla. Única dependencia externa: [jsPDF](https://github.com/parallax/jsPDF) (vía CDN). Persistencia en `localStorage`.

## Uso

Sirve la carpeta con cualquier servidor estático:

```bash
npx serve .
```

Abre la URL en el navegador. La primera vez configuras tus datos (nombre, NIF, contacto) y ya puedes crear documentos.

## Estructura

```
factura-pro/
├── index.html      # Vistas: home, formulario, detalle, ajustes + modales
├── style.css       # Diseño mobile-first
├── app.js          # Lógica completa (sin frameworks)
├── manifest.json   # Configuración PWA
├── sw.js           # Service worker (offline)
└── icons/icon.svg  # Icono de la app
```

## Despliegue en Vercel

Conecta el repo `daferur-lang/factura-pro` en [vercel.com](https://vercel.com) y despliega la rama `claude/invoice-pwa-vercel-e4yk45` (o haz merge a main). El `vercel.json` ya está configurado.
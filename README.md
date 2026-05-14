# 🏋️ IronLog — Next.js + Tailwind + IndexedDB

App web de gimnasio desplegable en Vercel. Sin servidor, sin base de datos externa.
Los datos se guardan en el navegador del móvil (IndexedDB).

---

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — diseño oscuro optimizado para móvil
- **IndexedDB (idb)** — base de datos local en el navegador
- **Zustand** — estado global con persistencia en localStorage
- **Google Fonts** — Bebas Neue + DM Sans (sin instalación manual)

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 en el móvil usando la IP local:
```
http://192.168.X.X:3000
```

---

## Despliegue en Vercel (gratis)

1. Sube el proyecto a GitHub
2. Ve a https://vercel.com → New Project → importa el repo
3. Vercel detecta Next.js automáticamente
4. Deploy → en 1 minuto tienes una URL pública

Desde el iPhone en el gimnasio abre esa URL en Safari.

### Instalar como app (PWA)

En Safari del iPhone:
1. Abre la URL de Vercel
2. Toca el botón compartir → **"Añadir a pantalla de inicio"**
3. La app aparece como una app nativa sin barra del navegador

---

## Estructura

```
ironlog-next/
├── app/
│   ├── layout.tsx         # Root: fuentes, metadata PWA
│   ├── page.tsx           # Redirect a /tabs/home o /setup
│   ├── globals.css        # Tailwind + estilos móvil
│   ├── setup/page.tsx     # Primera vez: nombre y objetivo
│   ├── tabs/
│   │   ├── layout.tsx     # Bottom navigation
│   │   ├── home/          # Dashboard
│   │   ├── routine/       # CRUD rutinas
│   │   ├── progress/      # Gráficas y 1RM
│   │   ├── history/       # Historial de sesiones
│   │   └── profile/       # Perfil + backup
│   └── workout/
│       ├── session/       # Sesión activa
│       └── complete/      # Resumen post-entreno
├── lib/
│   ├── db.ts              # IndexedDB helpers + seed + export/import
│   └── calculations.ts    # 1RM, volumen, racha, etc.
├── store/index.ts         # Zustand: profile, routines, workout
└── types/index.ts         # TypeScript types
```

---

## Backup de datos

Los datos viven en el navegador del móvil (IndexedDB).
Ve a **Perfil → Exportar datos** para descargar un JSON de backup.
Si cambias de móvil, importa ese JSON en el nuevo.

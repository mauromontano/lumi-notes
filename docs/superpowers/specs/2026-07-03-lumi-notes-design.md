# Lumi Notes — Design Doc

**Fecha:** 2026-07-03
**Estado:** aprobado en brainstorming, pendiente de plan de implementación

## Resumen

Lumi Notes es una app personal de notas para iPhone construida con React Native (Expo). Su diferencial: crear notas dictando por voz a **Lumi**, un orbe de luz animado que escucha, "piensa" (Claude formatea la transcripción en una nota prolija) y anota. Las notas pueden tener recordatorios por notificación local, únicos o recurrentes.

## Decisiones de alcance

- **Uso:** personal (un solo usuario, el desarrollador). Sin backend, sin cuentas, sin publicación en stores.
- **Plataforma:** solo iOS (iPhone), development build instalada desde Mac.
- **Nombre:** app "Lumi Notes", personaje/orbe "Lumi". Carpeta `lumi-notes/`.
- **IA:** dictado nativo de iOS transcribe; Claude (API de Anthropic, key propia) formatea.

## Features v1

1. Crear nota por **texto** (editor simple: título + cuerpo).
2. Crear nota por **voz**: dictado con transcripción en vivo → Claude genera título + cuerpo formateado (bullets si se dictó una enumeración) → preview editable → guardar.
3. **Editar por voz** una nota existente: se dicta una instrucción ("agregale pan a la lista") → Claude devuelve la nota modificada → preview con posibilidad de deshacer → confirmar.
4. **Recordatorios:** fecha/hora única o recurrente (diario, semanal, mensual) vía notificación local. Tocar la notificación abre la nota. Badge con fecha en la lista.
5. **Búsqueda** por texto en título y cuerpo.
6. **Pin/favoritos:** notas fijadas arriba de la lista.
7. Editar manualmente y borrar notas.

## UX / Flujos

**Pantalla principal:** lista de notas (pineadas arriba), barra de búsqueda, Lumi flotando abajo al centro como botón principal, botón secundario discreto para nota por texto.

**Flujo de voz (inmersivo):**
1. Tocar a Lumi → pantalla completa de dictado: orbe gigante centrado que reacciona al volumen de la voz, transcripción en vivo debajo, botón "Listo".
2. Confirmar (o silencio prolongado) → estado *pensando* → Claude formatea.
3. Preview: Lumi chico arriba en estado *éxito*, nota generada (título + cuerpo, editable al tocar), toggle "Recordarme" con chips rápidos ("Mañana 9:00" / elegir fecha-hora) y chips de recurrencia (una vez / diario / semanal / mensual), botones **Re-dictar** y **Guardar**.

**Estados de Lumi:** `idle` (flota suave) → `listening` (pulsa/se deforma con el volumen) → `thinking` (gira/brilla) → `success` (destello verde) | `error` (parpadeo ámbar) → `idle`.

## Diseño visual

- **Tema oscuro "Aurora Noche":** fondo azul-negro profundo, tarjetas glass con borde sutil, tipografía clara.
- **Tema claro "Amanecer Suave":** fondo crema cálido, tarjetas blancas con sombras suaves.
- Sigue la preferencia del sistema iOS (con override manual en ajustes).
- **Orbe adaptativo:** Lumi es violeta-cian en dark y durazno-rosa en light. En estados success/error vira a verde/ámbar.
- Mockups de referencia en `.superpowers/brainstorm/` (visual-style, theme-orb, voice-capture, note-preview).

## Arquitectura técnica

**Stack:** Expo (SDK más reciente) + TypeScript + expo-router. Development build (`expo prebuild` + build local con Xcode) porque el reconocimiento de voz es módulo nativo.

| Módulo | Librería | Rol |
|---|---|---|
| Voz | `expo-speech-recognition` | Dictado nativo iOS en español, resultados parciales + eventos de volumen (anima el orbe) |
| IA | API Anthropic (fetch directo) | Formateo de transcripción y edición por instrucción; respuesta JSON `{titulo, cuerpo}`. Modelo por defecto: Claude Haiku (suficiente para formatear y barato: ~USD 0.002/nota, ~USD 0.20/mes con 3 notas diarias) |
| Storage | `expo-sqlite` | Persistencia local; búsqueda con `LIKE` |
| Recordatorios | `expo-notifications` | Notificaciones locales con triggers de calendario (única/diaria/semanal/mensual) |
| Orbe | `react-native-reanimated` + `@shopify/react-native-skia` | Gradientes radiales, glow, deformación por volumen, transiciones de estado |
| Secrets | `expo-secure-store` | API key de Anthropic en el keychain; se ingresa una vez en ajustes |

**Pantallas (expo-router):** lista principal, editor/detalle de nota, captura de voz (modal fullscreen), ajustes mínimos (API key, tema).

**Modelo de datos — tabla `notes`:**

```sql
id TEXT PRIMARY KEY,
title TEXT NOT NULL,
body TEXT NOT NULL,            -- texto plano con bullets markdown ("- item")
pinned INTEGER DEFAULT 0,
reminder_at TEXT,              -- ISO 8601, NULL si no hay recordatorio
reminder_recurrence TEXT,      -- 'none' | 'daily' | 'weekly' | 'monthly'
notification_id TEXT,          -- id de expo-notifications para cancelar/reprogramar
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL
```

Sin categorías ni tags (YAGNI).

**Flujo de datos (crear por voz):**
Mic → `expo-speech-recognition` (parciales en pantalla + volumen al orbe) → texto final → Claude (prompt de formateo, JSON) → preview → INSERT en SQLite → si hay recordatorio, agendar notificación y guardar `notification_id`.

**Flujo de edición por voz:**
Nota actual + instrucción dictada → Claude → nota modificada → preview (con "deshacer" que restaura la versión anterior; disponible en memoria mientras la nota siga abierta, no persiste historial de versiones) → UPDATE + reprogramación de notificación si cambió.

**Máquina de estados de Lumi:** componente del orbe recibe `state` + `volumeLevel`; anima con Reanimated/Skia según el estado.

**Proveedor de IA intercambiable:** el Cliente IA se implementa detrás de una interfaz mínima (`formatNote(transcripcion)` / `editNote(nota, instruccion)` → `{titulo, cuerpo}`). v1 usa la API de Anthropic (Claude Haiku); a futuro se puede reemplazar por un modelo on-device (p. ej. Apple Foundation Models, iOS 26+) sin tocar el resto de la app.

## Manejo de errores

- **Sin internet / API caída / timeout (~15s):** Lumi pasa a *error*; se ofrece guardar la transcripción cruda. Nunca se pierde lo dictado.
- **JSON inválido de Claude:** 1 reintento automático; si falla, guardar transcripción cruda.
- **Permisos denegados (mic/voz/notificaciones):** pantalla explicativa con link a Ajustes de iOS. Los permisos se piden en el primer uso de cada feature.
- **Recordatorio en el pasado:** bloqueado por validación en el picker.
- **Editar/borrar nota con recordatorio:** cancelar notificación vieja por `notification_id`, reprogramar si corresponde.
- **API key no configurada:** el dictado guarda la transcripción sin formatear y avisa.

## Testing

- **Unit (Jest):** parseo de respuesta de Claude, cálculo de triggers de recurrencia, repositorio de notas (SQLite), máquina de estados de Lumi.
- **Manual en iPhone real:** voz, notificaciones, animaciones (checklist por feature en el plan de implementación).
- Sin E2E automatizado.

## Fuera de alcance (v1)

Sync/backup en la nube, compartir notas, categorías/tags, widget iOS, Apple Watch, detección automática de recordatorios en el dictado, Android, modelo de IA on-device (Apple Foundation Models) como reemplazo de la API de Claude.

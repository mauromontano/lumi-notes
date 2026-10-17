# Lumi · iPhone

Frente App de chats por tema. **Esta entrega usa exclusivamente un adaptador simulado**:
no hay conexión a Claude, transcripción de servidor, almacenamiento remoto ni movimientos
financieros reales. Finanzas está habilitado; Compras y ofertas es un ejemplo vacío,
sin integraciones ni envíos. No hay notas que migrar.

La planificación y el contrato únicos siguen en el ODD de `mauro-docs`:
`salp/odd/lumi/001-agentes-personales/odd.md` (checkout coordinador:
`/Users/mauromontano/orca/workspaces/mauro-docs`). Este README documenta ejecución y
resultados de la implementación; no reemplaza ese ODD ni cambia HTTP v1.

## Ejecutar la demo

Node 22.13+ (validado con 24.13.0), npm y Expo SDK 57.

```sh
npm ci
npx expo start --go --ios
```

Vincular con `LUMI-DEMO`. El token de **demo** se conserva en SecureStore, con namespace
separado de una futura credencial real. El historial simulado vive en memoria y se
reinicia al terminar el proceso. No cargar información personal. Los archivos elegidos
permanecen locales: el mock no sube bytes a un servicio.

- Texto normal: aceptación → procesamiento → respuesta identificada como simulada.
- `/error`: fallo de procesamiento; Reintentar conserva id y texto original.
- `/cuota`: cuota agotada; Reintentar manual, sin fallback facturable.
- `/aclarar`: pregunta de aclaración, respondible en la misma conversación.
- Home → Compras y ofertas: historial vacío y envío deshabilitado.
- Fixtures de Finanzas: resultado de tarea y audio expirado con transcripción.
- El botón de reporte explica que el ejemplo no tiene un reporte privado real.
- Grabar → terminar → escuchar → enviar; cancelar descarta la grabación. Imágenes y
  PDF se eligen con los selectores del sistema. 25 MiB/archivo, 5 minutos/audio; 30 páginas
  por PDF se informa en UI y debe verificarse en servidor, junto al formato real.
- Sin conexión no se envía. Reconectar solo consulta estado: nunca reenvía borradores.
  Un intento fallido conserva payload/id para el reintento manual mientras la pantalla
  siga abierta; puede descartarse explícitamente. Borradores no persisten entre procesos.

## Código e integración

- `src/chat/types.ts`: tipos locales de HTTP v1 y `ChatGateway`.
- `MockChatGateway.ts` y `fixtures.ts`: doble explícito, revisiones, páginas, estados y
  respuestas sintéticas; `localUri` queda fuera de los mensajes del contrato.
- `ChatProvider.tsx`: vinculación, sincronización en primer plano (3 s pendiente / 30 s
  inactivo, backoff de hasta 60 s), bootstrap, reconciliación y rechazo offline.
- `Composer.tsx` / `AudioMessage.tsx`: selección, grabación y reproducción nativas.
- `src/app`: home, conversación por tema y apariencia; tema claro/oscuro y orb reutilizados.

Para T03, implementar el transporte HTTP detrás del gateway y cambiar su construcción
en el provider. No basta cambiar una variable: cualquier `EXPO_PUBLIC_CHAT_MODE` distinto
de `mock` falla explícitamente. El adaptador real debe recibir la credencial segura,
subir bytes multipart con `clientUploadId` estable y enviar después `attachmentId`;
resolver `clientMessageId` al `messageId` del endpoint de retry y conservar el payload
ante timeouts de aceptación. El mock no acredita deduplicación del servidor.

Confirmar OpenAPI/fixtures de Infra antes de integrar. No se propusieron cambios de
endpoints. `bootstrap` y `getAttachmentAccess` son auxiliares del gateway para rutas ya
existentes en HTTP v1. Acordar con Infra nombres concretos de campos de `limits`, códigos
de autenticación/cursor y representación final de `reportRefs` (el ODD indica IDs).

Pendiente de integración: HTTPS y enrolamiento real de un uso, token revocable/401,
429/Retry-After, subidas y acceso privado/410, transcripción, extracción de documentos,
catálogo/enlaces temporales de reportes y persistencia real. El listener de notificaciones
abre el tema por `topicId`; falta conectar registro de token Expo/APNs y comprobar push
con permisos concedidos/denegados y app cerrada. El historial no depende del push.

Se retiraron rutas de notas/dictado, llamada a Anthropic, configuración de claves,
extensión de compartir a notas y App Intent de dictado. Utilidades antiguas de notas,
backups y sus tests quedan sin ruta de producto; documentos anteriores bajo `docs/`
son históricos. No se borraron backups externos ni datos de otros repos.

## Preview interno iPhone

`eas.json`: perfil `preview`, distribución `internal`, `ios.simulator=false`, modo
`mock`. Conserva bundle ID `com.mauro.luminotes` y proyecto EAS existente. El target
nativo se llama `Lumi`; el directorio iOS está versionado y fue regenerado con SDK 57.
Usa el icono PNG existente de Lumi; las fuentes Icon Composer siguen en `assets/expo.icon`.

```sh
npm ci
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo export --platform ios
# Si se cambia app.json, sincronizar y revisar el diff nativo antes del build:
npx expo prebuild --platform ios --no-install
```

Después de coordinar firma, UDID y costo en T09:

```sh
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

**No se ejecutó build remoto ni se verificaron cuenta, firma o dispositivo registrado.**
No hay publicación en tiendas. Para compilación local instalar CocoaPods 1.15.2+ y
usar `npx expo run:ios`; este entorno no tiene CocoaPods. EAS no sincroniza app.json
cuando se versiona `ios/`, por lo que el prebuild y su revisión son obligatorios.

## Validación del 2026-10-16

Base inspeccionada: `dc2574c`, árbol limpio antes de implementar, coincidente con el ODD.
Documentación de Expo v57 leída antes de editar. Dependencias actualizadas dentro de
SDK 57 a Expo 57.0.30 / React Native 0.86.3, incluyendo audio, image picker y network.

- Automatizadas: TypeScript, ESLint, 17 suites / 107 tests, exportación iOS **con bytecode
  Hermes**, prebuild iOS y `git diff --check`. Los tests del gateway cubren aceptación,
  replay/conflicto, mismo id/payload en retry, cuota, aclaración, audio expirado,
  paginación/revisiones, límites, enlaces malformados y rechazo offline sin cola.
- Expo Doctor: 19/21. Restan CocoaPods ausente y advertencia esperada por configuración
  nativa versionada. Configuración de assets y compatibilidad de paquetes pasan.
- Simulador: iPhone 17 Pro, iOS 26.5, Expo Go SDK 57. Vinculación, home, Finanzas,
  envío de texto, procesamiento, fallo simulado/reintento completado, permiso de micrófono
  denegado, entrada por enlace al chat y capturas claras/oscuras inspeccionadas.
  No equivale a ejecutar el binario preview. El grabador no pudo preparar audio en este
  entorno; se comprobó el error recuperable, no una grabación/reproducción completa.
- iPhone físico: **sin pruebas**. Pendientes audio real/cancelación/interrupciones,
  reproducción/pausa, selectores y envío de imagen/PDF, teclado en pantalla pequeña,
  Dynamic Type/VoiceOver, modo avión, reanudación, instalación firmada y push.
- Revisión estática adicional corrigió enlaces inválidos, descarte de borrador fallido,
  recuperación de bootstrap, ciclo de vida del grabador y contraste claro. Se corrigió
  un crash de Hermes causado por captura de `this` en un parámetro por defecto.

T01 requiere aún verificar la instalación del iPhone. T07 tiene implementación simulada
con los pendientes nativos anteriores. **T03/T04/T05/T06 no están acreditadas con mocks.**

### Rediseño aprobado — 2026-10-16

La app adopta **Lumi Noche** para oscuro y **Lumi Esencial** para claro, seleccionados
por Mauro desde `docs/prototypes/lumi-chats.html`. Sin filtros ni contadores de no leídos
en Home; `markRead` se conserva para compatibilidad con HTTP v1. Apariencia automática
según iPhone o manual en Preferencias. Búsqueda de temas, actualización al deslizar,
burbujas con fechas, adjuntos desde `+`, reproductor compacto y reportes desde el chat.
El gateway sigue simulado; no se modificó el contrato ni se integró infraestructura.

Validación de este cambio: TypeScript y ESLint correctos; 17 suites / 107 tests correctos;
exportación iOS/Hermes correcta. En simulador iPhone 17 Pro/iOS 26.5: capturas nativas
oscuro y claro, texto XXXL, teclado, envío de texto y respuesta simulada. Se corrigió
recorte del encabezado con texto grande; revisión visual independiente confirmó la
corrección. El overlay azul pertenece a Expo Go, no al diseño de Lumi.

Mauro informó haber probado texto y audio en iPhone antes del rediseño. Esta versión
visual todavía requiere repetir allí grabación, reproducción, imagen/PDF y teclado;
las pruebas de simulador no acreditan audio ni integración real en el dispositivo.

### Ajustes de medios — 2026-10-16

Tras prueba de Mauro en iPhone (audio audible con duración inicial 0:00; selección de
imágenes aparentemente correcta): el reproductor usa `durationMs` del adjunto/borrador
hasta cargar la duración del archivo. Las imágenes disponibles muestran una miniatura
contenida en la burbuja; acceso mediante ChatGateway, indicador de carga y reintento.
No cambia persistencia ni transporte. TypeScript, lint, 107 tests existentes y exportación
iOS/Hermes correctos. Estos ajustes aún no fueron verificados visualmente en simulador
ni en iPhone físico; repetir duración antes de Play y preview de imagen enviada allí.

Verificación posterior de medios: se reinició Metro en puerto 8084 con `--clear` y
Expo Go del simulador. En iPhone 17 Pro/iOS 26.5 se observó duración `0:00 / 0:06`
en borrador y mensaje de audio enviado antes de Play, y miniatura HEIC visible dentro
del chat. La prueba inicial de micrófono dio error antes del reinicio; no se verificó
calidad audible en simulador. Mauro indicó que después del reinicio ahora parece
funcionar. Esto acredita UI local con gateway simulado, no persistencia/backend real.


### Integración HTTP real — 2026-10-16

Este corte reemplaza la limitación anterior de solo demo. El modo predeterminado sigue
siendo mock. Para conectar usar EXPO_PUBLIC_CHAT_MODE=http y EXPO_PUBLIC_LUMI_API_URL
con el origen HTTPS de Lumi. No poner tokens ni credenciales en EXPO_PUBLIC. Pairing de
un uso guarda el token revocable en SecureStore separado por servidor y del modo demo.
El perfil preview-connected hereda el preview iOS; requiere definir URL antes del build.
No se ejecutó un build remoto ni se configuró firma/UDID en este corte.

HttpChatGateway adapta sobres/items, 202/204, cursores opacos, nextBefore null, retry con
ID del servidor, errores 401/429/410 y uploads multipart con ID estable. No reenvía al
reconectar ni habilita cola offline. expo/fetch recibe File directamente: File.slice
construía un Blob de ArrayBuffer incompatible con Hermes/Expo Go; la prueba nativa lo
detectó y se corrigió. El servidor verifica contenido y tamaño además del cliente.

Preferencias permite activar notificaciones. El token se sincroniza al vincular/volver
al foreground sin pedir permiso automáticamente. Denegarlo no impide recuperar mensajes.
La recepción APNs con app cerrada requiere prueba en build firmado/iPhone físico; no
está acreditada con Expo Go ni tests. El servidor mantiene push desactivado por defecto.

Validación: 19 suites / 121 tests; TypeScript, lint y export iOS/Hermes. El script de
lumi-server scripts/smoke-app-gateway.ts ejecutó este gateway contra HTTP y PostgreSQL
reales locales (medios/agente dobles). Evidencia nativa: iPhone 17 Pro/iOS26.5 simulado,
Expo Go, pairing real, texto a Claude Pro, reporte privado abierto en Safari y PNG
sintético subido/procesado por OCR y Claude. ARS 1234,50 y ARS 203 en schema aislado.
Capturas en docs/evidence/http-pilot-2026-10-16. No contienen datos personales ni tokens.
No acredita audio/PDF nativo integrado, push, iPhone físico, Railway ni piloto completo.

Para QA local del simulador: EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true, URL127.0.0.1:3092,
EXPO_PUBLIC_CHAT_MODE=http, REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 y expo start --lan.
Usar el script pilot-local del backend con los runtimes personales configurados.
La excepción HTTP solo funciona en desarrollo y direcciones privadas/localhost.
Al terminar el ensayo se eliminan schema y originales sintéticos; el token de ese
servidor deja de servir. Un nuevo ensayo requiere vincularse nuevamente.

### Ahorro en reposo — 2026-10-16

Se eliminó el polling cada30s de chats inactivos. Se actualiza al abrir/volver a la app,
al refrescar manualmente y al recibir una notificación. Mientras hay queued/processing
consulta cada3s, con backoff por fallos, hasta10min o tres fallos seguidos. Luego espera
otra acción/push sin cancelar el trabajo del servidor. Cuota pendiente no hace polling.
Sin permiso push, las novedades de jobs llegan al volver o actualizar; no se mantiene
la base despierta para buscar novedades. 20 suites/122 tests, tsc/lint/export iOS correctos.
No se midió aún ahorro real en Railway/Neon ni entrega push en dispositivo físico.

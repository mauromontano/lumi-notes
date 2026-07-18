# Comandos útiles — Lumi Notes

> **Node 22 requerido.** Antes de correr `jest`, `eslint`, `tsc`, `ctx7` o el CLI de Expo,
> exportá el PATH de nvm en la terminal:
>
> ```bash
> export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"
> ```

## Desarrollo

```bash
npx expo start                 # Metro bundler (dev)
npx expo run:ios --device      # build nativo + correr en iPhone conectado por cable
                               #   (sin valor abre un picker con los dispositivos)
npx expo run:ios               # correr en el simulador de iOS
```

`run:ios` corre `prebuild` automáticamente. Si cambiaste algo nativo (íconos, **splash**,
plugins, permisos) y no se refleja, forzá la regeneración:

```bash
npx expo prebuild -p ios       # regenera ios/ respetando ediciones
npx expo prebuild --clean      # regenera ios/ desde cero (descarta ediciones manuales)
```

## Builds con EAS

Perfiles definidos en `eas.json` (todos distribución interna salvo producción):

```bash
eas build --profile development --platform ios   # dev client (con dev tools)
eas build --profile preview --platform ios       # preview final (.ipa interno) ← el que usás para testear
eas build --profile production --platform ios     # build de producción (autoIncrement)
```

Submit a la App Store:

```bash
eas submit --profile production --platform ios
```

## Calidad (correr antes de commitear)

```bash
npx tsc --noEmit               # typecheck
npx eslint src                 # lint
npx jest                       # tests (104 tests)
```

## Notas

- Primer build a un iPhone nuevo: abrí `ios/LumiNotes.xcworkspace` en Xcode una vez para
  configurar el *Signing team* (bundle id `com.mauro.luminotes`), luego confiá el perfil de
  desarrollador en *Ajustes → General → VPN y gestión de dispositivos* en el teléfono.
- El **splash** y los íconos se generan en `prebuild` a partir de `app.json`
  (`assets/images/splash-orb.png`, `assets/expo.icon/`). Cambios ahí necesitan rebuild nativo,
  no alcanza con recargar Metro.

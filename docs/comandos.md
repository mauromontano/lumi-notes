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

### Build recomendado (evita el fallo de 2FA de Apple)

A veces el build falla al pedir el código 2FA por SMS de Apple
("Verification codes can't be sent to this phone number at this time").
Para evitarlo, exportá la App Store Connect API Key antes de buildear así EAS
no necesita loguearse en Apple ni pedir 2FA:

```bash
export EXPO_ASC_API_KEY_PATH="$HOME/.private-keys/AuthKey_P8ZTM74C8T.p8"
export EXPO_ASC_KEY_ID="P8ZTM74C8T"
export EXPO_ASC_ISSUER_ID="ec076c66-dfad-4d3d-bff2-d72c9e932101"

eas build --platform ios --profile preview
```

- Si te piden **Apple Team ID**: `7D98L595LZ`
- El `.p8` es la API key descargada de App Store Connect (Users and Access →
  Integrations → App Store Connect API). Guardá el archivo en un lugar seguro;
  Apple solo lo deja descargar una vez.

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

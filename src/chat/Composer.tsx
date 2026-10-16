import React, { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, AppState, Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeContext';
import { useChat, Outgoing } from './ChatProvider';
import { Action, IconButton, Input, styles } from './ui';
import { AudioPlayer } from './AudioMessage';
import { validateFile } from './types';
type DraftFile = { uri: string; mimeType: string; name: string; durationMs?: number };
export function Composer({ topicId, enabled }: { topicId: string; enabled: boolean }) {
  const chat = useChat(), { palette } = useTheme();
  const [text, setText] = useState(''), [file, setFile] = useState<DraftFile | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Outgoing | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY), recording = useAudioRecorderState(recorder, 200);
  const locked = useRef(false), active = useRef(true);
  const stop = async (cancel = false) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const durationMs = recorder.getStatus().durationMillis;
      await recorder.stop(); await setAudioModeAsync({ allowsRecording: false });
      if (!cancel && recorder.uri) setFile({ uri: recorder.uri, mimeType: 'audio/mp4', name: 'Mensaje de audio.m4a', durationMs: Math.min(durationMs, 300000) });
      if (cancel && recorder.uri) { const f = new File(recorder.uri); if (f.exists) f.delete(); }
    } catch { if (active.current) setError('No se pudo guardar el audio. Volvé a grabarlo.'); } finally { locked.current = false; if (active.current) setBusy(false); }
  };
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; });
  useEffect(() => {
    active.current = true;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        try { if (recorder.getStatus().isRecording) void stopRef.current(true); } catch { /* Hook already released the native recorder during refresh/unmount. */ }
      }
    });
    return () => { active.current = false; sub.remove(); void setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }; // useAudioRecorder releases/stops the native recorder.
  }, [recorder]);
  useEffect(() => { if (recording.isRecording && recording.durationMillis >= 300000) void stopRef.current(); }, [recording.durationMillis, recording.isRecording]);
  const start = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { Alert.alert('Micrófono deshabilitado', 'Permití el acceso al micrófono en Ajustes del iPhone para grabar. También podés escribir o adjuntar archivos.'); return; }
      if (!active.current || AppState.currentState !== 'active') return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!active.current || AppState.currentState !== 'active') { await recorder.stop(); await setAudioModeAsync({ allowsRecording: false }); return; }
      recorder.record();
    } catch { if (active.current) setError('No se pudo iniciar la grabación. Revisá el micrófono y volvé a intentar. Podés seguir escribiendo.'); await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); } finally { locked.current = false; if (active.current) setBusy(false); }
  };
  const select = async (image: boolean) => {
    setError(null);
    try {
      let next: DraftFile | undefined;
      if (image) {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
        if (!result.canceled) { const a = result.assets[0]; next = { uri: a.uri, mimeType: a.mimeType || 'image/jpeg', name: a.fileName || 'Imagen.jpg' }; }
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!result.canceled) { const a = result.assets[0]; next = { uri: a.uri, mimeType: a.mimeType || 'application/pdf', name: a.name }; }
      }
      if (next) { validateFile(next.mimeType, new File(next.uri).size); setFile(next); }
    } catch (e) { setError((e as Error).message); }
  };
  const send = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    const base = { topicId, clientMessageId: randomUUID() };
    const outgoing: Outgoing = failed ?? (file ? file.durationMs !== undefined ? { kind: 'audio', input: { ...base, localUri: file.uri, mimeType: file.mimeType, durationMs: file.durationMs } } : { kind: 'attachment', input: { ...base, localUri: file.uri, mimeType: file.mimeType, fileName: file.name, caption: text.trim() || undefined } } : { kind: 'text', input: { ...base, text: text.trim() } });
    try { await chat.send(outgoing); setText(''); setFile(null); setFailed(null); }
    catch (e) { setError((e as Error).message); setFailed(outgoing); }
    finally { locked.current = false; setBusy(false); }
  };
  if (!enabled) return <Text style={{ color: palette.textMuted, padding: 20 }}>Ejemplo simulado. Este tema todavía no admite envíos.</Text>;
  return <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: palette.surface, gap: 10, borderTopWidth: 1, borderColor: palette.cardBorder }}>
    {error && <Text accessibilityRole="alert" style={{ color: palette.danger }}>{error}</Text>}
    {recording.isRecording ? <>
      <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>Grabando · {Math.floor(recording.durationMillis / 1000)} s de 300 s</Text>
      <View style={styles.row}><Action title="Cancelar grabación" disabled={busy} onPress={() => { void stop(true); }} /><Action title="Terminar audio" disabled={busy} onPress={() => { void stop(); }} /></View>
    </> : <>
      {file && <View style={{ gap: 8 }}><Text numberOfLines={2} style={{ color: palette.text }}>{file.name}</Text>{file.mimeType.startsWith('image/') && <Image source={{ uri: file.uri }} accessibilityLabel="Imagen seleccionada" style={{ width: 80, height: 80, borderRadius: 8 }} />}{file.durationMs !== undefined && <AudioPlayer key={file.uri} durationMs={file.durationMs} resolve={async () => file.uri} />}<Action title="Quitar adjunto" disabled={busy || !!failed} onPress={() => setFile(null)} /></View>}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <IconButton name="plus" label="Agregar imagen o PDF" disabled={busy || !!failed || !!file} onPress={() => ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancelar', 'Foto o imagen', 'Documento PDF'], cancelButtonIndex: 0, message: 'Hasta 25 MiB · PDF: 30 páginas' }, index => { if (index === 1 || index === 2) void select(index === 1); })} />
        <Input accessibilityLabel="Mensaje" placeholder={file?.durationMs !== undefined ? 'Audio listo' : 'Mensaje'} multiline maxLength={12000} value={text} editable={!busy && !failed && file?.durationMs === undefined} onChangeText={setText} style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, borderRadius: 22, backgroundColor: palette.bg }} />
        <IconButton filled name={busy ? 'hourglass' : failed ? 'arrow.clockwise' : text.trim() || file ? 'arrow.up' : 'mic.fill'} label={busy ? 'Enviando' : failed ? 'Reintentar envío' : text.trim() || file ? 'Enviar mensaje' : 'Grabar audio'} disabled={busy || !chat.online} onPress={() => { if (text.trim() || file || failed) void send(); else void start(); }} />
      </View>
      {failed && <><Text style={{ color: palette.textMuted }}>El envío conserva su identificador. Reintentar no crea otro pedido.</Text><Action title="Descartar este borrador" disabled={busy} onPress={() => Alert.alert('¿Descartar borrador?', 'Si el servidor llegó a aceptar el pedido, puede seguir procesándolo. Consultá el historial antes de volver a enviarlo.', [{ text: 'Conservar', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: () => { setFailed(null); setText(''); setFile(null); setError(null); } }])} /></>}

    </>}
  </View>;
}

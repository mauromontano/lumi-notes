import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Action } from './ui';
import { useTheme } from '@/theme/ThemeContext';
export function AudioPlayer({ resolve }: { resolve: () => Promise<string> }) {
  const player = useAudioPlayer(null), status = useAudioPlayerStatus(player);
  const loaded = useRef(false);
  const [busy, setBusy] = useState(false);
  const { palette } = useTheme();
  useEffect(() => { const sub = AppState.addEventListener('change', s => { if (s !== 'active') player.pause(); }); return () => sub.remove(); }, [player]);
  return <View style={{ gap: 6 }}><Action title={busy ? 'Abriendo audio…' : status.playing ? 'Pausar audio' : 'Reproducir audio'} disabled={busy} onPress={() => {
    if (status.playing) { player.pause(); return; }
    setBusy(true);
    void (async () => { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); if (!loaded.current) { const uri = await resolve(); player.replace(uri); loaded.current = true; }
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) await player.seekTo(0);
      player.play(); })().catch(e => Alert.alert('Audio no disponible', e.message)).finally(() => setBusy(false));
  }} /><Text style={{ color: palette.textMuted }}>{Math.floor(status.currentTime)} s / {Math.floor(status.duration)} s</Text></View>;
}

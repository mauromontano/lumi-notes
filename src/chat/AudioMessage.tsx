import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { IconButton } from './ui';
import { useTheme } from '@/theme/ThemeContext';
export function AudioPlayer({ resolve, durationMs }: { resolve: () => Promise<string>; durationMs?: number }) {
  const player = useAudioPlayer(null), status = useAudioPlayerStatus(player);
  // Media is loaded on first play; recorder/server metadata is available before then.
  const duration = status.duration > 0 ? status.duration : Math.max(0, (durationMs || 0) / 1000);
  const loaded = useRef(false);
  const [busy, setBusy] = useState(false);
  const { palette } = useTheme();
  useEffect(() => { const sub = AppState.addEventListener('change', s => { if (s !== 'active') player.pause(); }); return () => sub.remove(); }, [player]);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 190 }}><IconButton name={busy ? 'hourglass' : status.playing ? 'pause.fill' : 'play.fill'} label={busy ? 'Abriendo audio…' : status.playing ? 'Pausar audio' : 'Reproducir audio'} disabled={busy} onPress={() => {
    if (status.playing) { player.pause(); return; }
    setBusy(true);
    void (async () => { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); if (!loaded.current) { const uri = await resolve(); player.replace(uri); loaded.current = true; }
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) await player.seekTo(0);
      player.play(); })().catch(e => Alert.alert('Audio no disponible', e.message)).finally(() => setBusy(false));
  }} /><View style={{ flex: 1, gap: 9 }}><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: duration || 1, now: status.currentTime }} style={{ height: 3, borderRadius: 2, backgroundColor: palette.cardBorder }}><View style={{ height: 3, borderRadius: 2, width: `${duration ? Math.min(100, status.currentTime / duration * 100) : 0}%`, backgroundColor: palette.accent }} /></View><Text style={{ color: palette.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{Math.floor(status.currentTime / 60)}:{String(Math.floor(status.currentTime % 60)).padStart(2, '0')} / {Math.floor(Math.ceil(duration) / 60)}:{String(Math.ceil(duration) % 60).padStart(2, '0')}</Text></View></View>;
}

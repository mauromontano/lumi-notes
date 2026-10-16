import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View, useWindowDimensions } from 'react-native';
import { useChat } from './ChatProvider';
import { useTheme } from '@/theme/ThemeContext';
import { Action } from './ui';

/** Resolve private attachment access through the gateway, never through the UI's transport. */
export function ImagePreview({ attachmentId, fileName }: { attachmentId: string; fileName: string }) {
  const { gateway } = useChat();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [uri, setUri] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    gateway.getAttachmentAccess(attachmentId).then(access => {
      if (active) setUri(access.url);
    }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [gateway, attachmentId, attempt]);
  return <View style={{ width: Math.min(220, width * 0.88 - 48), gap: 4 }}>
    {!failed && <View style={{ height: 160, borderRadius: 10, overflow: 'hidden', backgroundColor: palette.bg }}>
      {uri && <Image source={{ uri }} resizeMode="contain" accessibilityLabel={`Imagen enviada: ${fileName}`} style={{ width: '100%', height: '100%' }} onLoad={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />}
      {loading && <ActivityIndicator accessibilityLabel="Cargando miniatura" color={palette.accent} style={{ position: 'absolute', inset: 0 }} />}
    </View>}
    {failed && <><Text style={{ color: palette.textMuted, fontSize: 13 }}>No se pudo cargar la miniatura.</Text><Action subtle title="Reintentar miniatura" onPress={() => { setUri(undefined); setFailed(false); setLoading(true); setAttempt(n => n + 1); }} /></>}
  </View>;
}

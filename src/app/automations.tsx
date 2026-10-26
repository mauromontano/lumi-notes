import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useChat } from '@/chat/ChatProvider';
import { agentName, runsLine, sections, toggled, whenLabel } from '@/chat/automations';
import type { Automations } from '@/chat/types';
import { useTheme } from '@/theme/ThemeContext';
import { Action } from '@/chat/ui';
// T39: everything that runs on its own (watches, routines, reminders), with a switch for the ones that can pause.
export default function AutomationsScreen() {
  const chat = useChat();
  const { palette } = useTheme();
  const [data, setData] = useState<Automations>();
  const [error, setError] = useState<string>();
  // One switch change at a time per item, and no list that started before a change may overwrite it.
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const request = useRef(0);
  const shown = useRef(false);
  const load = useCallback(() => {
    const mine = ++request.current;
    setError(undefined);
    void chat.gateway.automations().then(d => { if (mine === request.current) { shown.current = true; setData(d); } }).catch(e => {
      if (mine !== request.current) return;
      const message = e instanceof Error ? e.message : 'No se pudo cargar.';
      // With a list already on screen, keep it and just say the refresh failed.
      if (shown.current) Alert.alert('Automatismos', message); else setError(message);
    });
  }, [chat.gateway]);
  useFocusEffect(load);
  const flip = (id: string, enabled: boolean) => {
    request.current++;
    setPending(p => new Set(p).add(id));
    setData(d => d && { ...d, items: toggled(d.items, id, enabled) });
    void chat.gateway.setAutomationEnabled(id, enabled)
      .then(item => setData(d => d && { ...d, items: d.items.map(i => i.id === item.id ? item : i) }))
      .catch(e => {
        setData(d => d && { ...d, items: toggled(d.items, id, !enabled) });
        Alert.alert('Automatismos', e instanceof Error ? e.message : 'No se pudo cambiar.');
      })
      .finally(() => setPending(p => { const next = new Set(p); next.delete(id); return next; }));
  };
  const muted = { color: palette.textMuted, fontSize: 15, lineHeight: 21 };
  if (error) return <View style={{ padding: 24, gap: 16 }}><Text style={muted}>{error}</Text><Action title="Reintentar" onPress={load} /></View>;
  if (!data) return <View style={{ padding: 24 }}><ActivityIndicator accessibilityLabel="Cargando automatismos" color={palette.accent} /></View>;
  const now = new Date();
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Text style={muted}>{runsLine(data.runsToday)}. Pasado el tope, los vigías avisan igual pero sin que el bot lo analice.</Text>
    {data.items.length === 0 && <Text style={muted}>Todavía no hay vigías, rutinas ni recordatorios. Pedile a un bot que esté atento a algo («avisame si falla el CI», «si pasan 3 días sin entrenar») y te deja una tarjeta para activarlo.</Text>}
    {sections(data.items).map(section => <View key={section.type} style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 20, fontWeight: '600', marginBottom: 4 }}>{section.title}</Text>
      {section.items.map(item => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.cardBorder }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
          <Text style={muted}>{`${agentName(item.agent, chat.topics)} · ${item.detail}${item.origin === 'registry' ? ' · fijo' : ''}`}</Text>
          {whenLabel(item, now) !== '' && <Text style={{ ...muted, fontSize: 13 }}>{whenLabel(item, now)}</Text>}
        </View>
        {item.toggleable && <Switch accessibilityLabel={`${item.title}, de ${agentName(item.agent, chat.topics)}`} disabled={pending.has(item.id)} value={item.enabled} onValueChange={v => flip(item.id, v)} />}
      </View>)}
    </View>)}
  </ScrollView>;
}

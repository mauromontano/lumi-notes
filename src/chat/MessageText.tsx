import React, { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { styles } from '@/chat/ui';
import { parseMessage, type Span } from '@/chat/markdown';

/** A bot reply drawn from its Markdown: bold, italic, code, headings, lists and table rows, without the markers. */
export function MessageText({ text }: { text: string }) {
  const { palette } = useTheme();
  const blocks = useMemo(() => parseMessage(text), [text]);
  const span = (s: Span, i: number) => <Text key={i}
    onPress={s.link ? () => { void Linking.openURL(s.link!).catch(() => undefined); } : undefined}
    style={{
      fontWeight: s.bold ? '700' : undefined, fontStyle: s.italic ? 'italic' : undefined,
      fontFamily: s.code ? 'Menlo' : undefined, fontSize: s.code ? 14 : undefined,
      backgroundColor: s.code ? palette.cardBorder : undefined,
      color: s.link ? palette.accent : undefined, textDecorationLine: s.link ? 'underline' : undefined,
    }}>{s.text}</Text>;
  const body = [styles.body, { color: palette.text }];
  return <View style={{ gap: 6 }}>{blocks.map((b, i) => {
    if (b.kind === 'bullet' || b.kind === 'number') return <View key={i} style={{ flexDirection: 'row', gap: 6, paddingLeft: 2 }}>
      <Text style={[body, { minWidth: b.kind === 'number' ? 18 : 10 }]}>{b.kind === 'number' ? b.marker : '•'}</Text>
      <Text selectable style={[body, { flex: 1 }]}>{b.spans.map(span)}</Text>
    </View>;
    if (b.kind === 'heading') return <Text key={i} selectable accessibilityRole="header" style={[body, { fontWeight: '700', fontSize: 17, marginTop: i ? 4 : 0 }]}>{b.spans.map(span)}</Text>;
    if (b.kind === 'code') return <Text key={i} selectable style={[body, { fontFamily: 'Menlo', fontSize: 13, backgroundColor: palette.cardBorder, padding: 8, borderRadius: 8 }]}>{b.spans[0].text}</Text>;
    return <Text key={i} selectable style={body}>{b.spans.map(span)}</Text>;
  })}</View>;
}

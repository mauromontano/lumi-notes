import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { getDb } from '../db/database';
import { listNotes } from '../db/notesRepo';
import type { Note } from '../notes/types';
import { SwipeableNoteCard } from '../components/SwipeableNoteCard';
import { SearchBar } from '../components/SearchBar';
import { TagChips } from '../components/TagChips';
import { LumiOrb } from '../orb/LumiOrb';
import { useSharedValue } from 'react-native-reanimated';
import type { NoteTag } from '../notes/tags';

export default function NotesListScreen() {
  const { palette } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<NoteTag | null>(null);
  const idleVolume = useSharedValue(0);

  const refresh = useCallback(async (q: string, t: NoteTag | null) => {
    setNotes(await listNotes(getDb(), q || undefined, t || undefined));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(search, tagFilter);
    }, [refresh, search, tagFilter]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen
        options={{
          // custom + hidesSharedBackground: sin la cápsula glass/highlight de iOS 26
          unstable_headerRightItems: () => [
            {
              type: 'custom',
              hidesSharedBackground: true,
              element: (
                <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
                  <Text style={{ color: palette.textMuted, fontSize: 30 }}>⚙︎</Text>
                </Pressable>
              ),
            },
          ],
        }}
      />
      <SearchBar value={search} onChange={setSearch} />
      <TagChips selected={tagFilter} onSelect={setTagFilter} />
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <SwipeableNoteCard
            note={item}
            onPress={() => router.push(`/note/${item.id}`)}
            onDeleted={() => refresh(search, tagFilter)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            {search ? 'Sin resultados' : 'Tocá a Lumi para dictar tu primera nota ✦'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />
      {/* Lumi flotando abajo al centro */}
      <View style={styles.orbDock} pointerEvents="box-none">
        <Pressable onPress={() => router.push('/voice')} hitSlop={16}>
          <LumiOrb state="idle" volume={idleVolume} size={84} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/note/new')}
          style={[styles.textBtn, { borderColor: palette.cardBorder, backgroundColor: palette.card }]}
          hitSlop={8}
        >
          <Text style={{ color: palette.text, fontSize: 15 }}>＋ Nota de texto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 40 },
  orbDock: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' },
  textBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
});

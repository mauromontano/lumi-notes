import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { getDb } from '../db/database';
import { listNotes } from '../db/notesRepo';
import type { Note } from '../notes/types';
import { NoteCard } from '../components/NoteCard';
import { SearchBar } from '../components/SearchBar';
import { LumiOrb } from '../orb/LumiOrb';
import { useSharedValue } from 'react-native-reanimated';

export default function NotesListScreen() {
  const { palette } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const idleVolume = useSharedValue(0);

  const refresh = useCallback(async (q: string) => {
    setNotes(await listNotes(getDb(), q || undefined));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(search);
    }, [refresh, search]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Text style={{ color: palette.textMuted, fontSize: 18 }}>⚙︎</Text>
            </Pressable>
          ),
        }}
      />
      <SearchBar value={search} onChange={setSearch} />
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} />
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
        <Pressable onPress={() => router.push('/note/new')} style={styles.textBtn} hitSlop={12}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>＋ nota de texto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 40 },
  orbDock: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  textBtn: { marginTop: 6 },
});

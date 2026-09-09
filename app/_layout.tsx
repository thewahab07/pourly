/**
 * App shell.
 *
 * Boot order: load saved progress and settings, initialise audio with those
 * settings, then hide the splash screen and show the app. Nothing renders
 * before saved state is in place, so the UI never flashes default values.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import "../global.css";
import {
  initializeAudio,
  pauseMusic,
  releaseAudio,
  startMusic,
} from "../src/services/audio";
import { useProgressStore } from "../src/state/progressStore";
import { UI_COLORS } from "../src/theme/colors";

// Keep the splash visible while progress, settings and audio are prepared.
void SplashScreen.preventAutoHideAsync();

// Fade the splash out rather than cutting to the app.
void SplashScreen.setOptions({ duration: 320, fade: true });

export default function RootLayout() {
  const hydrate = useProgressStore((state) => state.hydrate);
  const [ready, setReady] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    const boot = async (): Promise<void> => {
      await hydrate();
      if (cancelled) return;

      // Audio is initialised with the settings that were just loaded, so a
      // player who turned music off never hears a burst of it at launch.
      await initializeAudio(useProgressStore.getState().settings);
      if (cancelled) return;

      startMusic();
      setReady(true);
    };

    void boot();

    return () => {
      cancelled = true;
      releaseAudio();
    };
  }, [hydrate]);

  // Background playback is deliberately disabled, so the music has to be picked
  // back up when the player returns to the game.
  useEffect(() => {
    if (!ready) return;

    const subscription = AppState.addEventListener("change", (next) => {
      const wasActive = appState.current === "active";
      appState.current = next;

      if (next === "active" && !wasActive) {
        startMusic();
      } else if (next !== "active" && wasActive) {
        pauseMusic();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [ready]);

  const onLayoutRootView = useCallback(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    // Matches the splash colour, so the hand-off is invisible.
    return <View style={styles.boot} />;
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: UI_COLORS.paper },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="levels" />
          <Stack.Screen name="settings" />
          <Stack.Screen
            name="game/[id]"
            options={{ animation: "slide_from_right" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: UI_COLORS.paper,
  },
});

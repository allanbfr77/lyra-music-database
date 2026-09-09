'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { findCueAtTime, findMatchingLineIndex, splitLyricLines, type YoutubeCaptionCue } from '@/lib/lyric-sync';

type VoiceSyncContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  supported: boolean;
  activeLineIndex: number | null;
  voiceSessionActive: boolean;
  onYoutubePlayerOpen: (videoId: string) => void;
  onYoutubePlayerClose: () => void;
  onYoutubePlaying: () => void;
  onYoutubeTime: (timeSec: number) => void;
  registerAutoScrollStart: (fn: (() => void) | null) => void;
};

const VoiceSyncContext = createContext<VoiceSyncContextValue>({
  enabled: false,
  setEnabled: () => {},
  supported: true,
  activeLineIndex: null,
  voiceSessionActive: false,
  onYoutubePlayerOpen: () => {},
  onYoutubePlayerClose: () => {},
  onYoutubePlaying: () => {},
  onYoutubeTime: () => {},
  registerAutoScrollStart: () => {},
});

export function useVoiceSync() {
  return useContext(VoiceSyncContext);
}

export default function VoiceSyncProvider({
  lyricsText,
  children,
}: {
  lyricsText: string;
  children: ReactNode;
}) {
  const [enabled, setEnabledState] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);

  const enabledRef = useRef(false);
  const youtubeOpenRef = useRef(false);
  const videoIdRef = useRef<string | null>(null);
  const cuesRef = useRef<YoutubeCaptionCue[]>([]);
  const cuesReadyRef = useRef(false);
  const playbackActiveRef = useRef(false);
  const lineIndexRef = useRef<number | null>(null);
  const autoScrollStartRef = useRef<(() => void) | null>(null);
  const lyricsTextRef = useRef(lyricsText);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    lyricsTextRef.current = lyricsText;
  }, [lyricsText]);

  useEffect(() => {
    lineIndexRef.current = activeLineIndex;
  }, [activeLineIndex]);

  const clearHighlight = useCallback(() => {
    lineIndexRef.current = null;
    setActiveLineIndex(null);
  }, []);

  const endSession = useCallback(() => {
    playbackActiveRef.current = false;
    setVoiceSessionActive(false);
    clearHighlight();
  }, [clearHighlight]);

  const activateVoiceFollow = useCallback(() => {
    if (!enabledRef.current || !youtubeOpenRef.current) return;
    if (!cuesReadyRef.current || cuesRef.current.length === 0) return;
    setVoiceSessionActive(true);
  }, []);

  const loadCaptions = useCallback(
    async (videoId: string) => {
      const seq = ++loadSeqRef.current;
      cuesRef.current = [];
      cuesReadyRef.current = false;
      try {
        const res = await fetch(`/api/youtube/captions/${encodeURIComponent(videoId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { cues?: YoutubeCaptionCue[] };
        if (seq !== loadSeqRef.current || videoIdRef.current !== videoId) return;
        cuesRef.current = Array.isArray(data.cues) ? data.cues : [];
        cuesReadyRef.current = true;
        if (playbackActiveRef.current) activateVoiceFollow();
      } catch {
        if (seq !== loadSeqRef.current) return;
        cuesRef.current = [];
        cuesReadyRef.current = true;
      }
    },
    [activateVoiceFollow]
  );

  const beginPlaybackSync = useCallback(() => {
    if (!enabledRef.current || !youtubeOpenRef.current) return;
    playbackActiveRef.current = true;
    autoScrollStartRef.current?.();
    activateVoiceFollow();
  }, [activateVoiceFollow]);

  const setEnabled = useCallback(
    (value: boolean) => {
      enabledRef.current = value;
      setEnabledState(value);
      if (!value) {
        endSession();
        return;
      }
      const videoId = videoIdRef.current;
      if (videoId && youtubeOpenRef.current) {
        void loadCaptions(videoId);
      }
    },
    [endSession, loadCaptions]
  );

  const onYoutubePlayerOpen = useCallback(
    (videoId: string) => {
      youtubeOpenRef.current = true;
      videoIdRef.current = videoId;
      endSession();
      if (enabledRef.current) void loadCaptions(videoId);
    },
    [endSession, loadCaptions]
  );

  const onYoutubePlayerClose = useCallback(() => {
    youtubeOpenRef.current = false;
    videoIdRef.current = null;
    cuesRef.current = [];
    cuesReadyRef.current = false;
    loadSeqRef.current += 1;
    endSession();
  }, [endSession]);

  const onYoutubePlaying = useCallback(() => {
    if (!enabledRef.current || !youtubeOpenRef.current) return;
    beginPlaybackSync();
  }, [beginPlaybackSync]);

  const onYoutubeTime = useCallback((timeSec: number) => {
    if (!enabledRef.current || !youtubeOpenRef.current) return;
    const cues = cuesRef.current;
    if (!cues.length) return;

    const cue = findCueAtTime(cues, timeSec);
    if (!cue) return;

    // Inclui o cue anterior para melhorar o casamento com linhas da letra.
    const index = cues.indexOf(cue);
    const prev = index > 0 ? cues[index - 1] : null;
    const transcript = [prev?.text, cue.text].filter(Boolean).join(' ');

    const lines = splitLyricLines(lyricsTextRef.current);
    const match = findMatchingLineIndex(lines, transcript, lineIndexRef.current);
    if (match == null || match === lineIndexRef.current) return;
    lineIndexRef.current = match;
    setActiveLineIndex(match);
    setVoiceSessionActive(true);
  }, []);

  const registerAutoScrollStart = useCallback((fn: (() => void) | null) => {
    autoScrollStartRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      loadSeqRef.current += 1;
      endSession();
    };
  }, [endSession]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      supported: true,
      activeLineIndex,
      voiceSessionActive,
      onYoutubePlayerOpen,
      onYoutubePlayerClose,
      onYoutubePlaying,
      onYoutubeTime,
      registerAutoScrollStart,
    }),
    [
      enabled,
      setEnabled,
      activeLineIndex,
      voiceSessionActive,
      onYoutubePlayerOpen,
      onYoutubePlayerClose,
      onYoutubePlaying,
      onYoutubeTime,
      registerAutoScrollStart,
    ]
  );

  return <VoiceSyncContext.Provider value={value}>{children}</VoiceSyncContext.Provider>;
}

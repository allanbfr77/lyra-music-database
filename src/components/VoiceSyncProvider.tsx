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
import {
  findMatchingLineIndex,
  getSpeechRecognitionCtor,
  splitLyricLines,
} from '@/lib/lyric-sync';

type VoiceSyncContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  supported: boolean;
  activeLineIndex: number | null;
  voiceSessionActive: boolean;
  onYoutubePlayerOpen: () => void;
  onYoutubePlayerClose: () => void;
  registerAutoScrollStart: (fn: (() => void) | null) => void;
};

const VoiceSyncContext = createContext<VoiceSyncContextValue>({
  enabled: false,
  setEnabled: () => {},
  supported: false,
  activeLineIndex: null,
  voiceSessionActive: false,
  onYoutubePlayerOpen: () => {},
  onYoutubePlayerClose: () => {},
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
  const [supported, setSupported] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);

  const enabledRef = useRef(false);
  const youtubeOpenRef = useRef(false);
  const sessionRef = useRef(false);
  const lineIndexRef = useRef<number | null>(null);
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: {
      resultIndex: number;
      results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
    }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  const autoScrollStartRef = useRef<(() => void) | null>(null);
  const lyricsTextRef = useRef(lyricsText);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    lyricsTextRef.current = lyricsText;
  }, [lyricsText]);

  useEffect(() => {
    lineIndexRef.current = activeLineIndex;
  }, [activeLineIndex]);

  const stopRecognition = useCallback(() => {
    sessionRef.current = false;
    setVoiceSessionActive(false);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* já parado */
        }
      }
    }
  }, []);

  const clearHighlight = useCallback(() => {
    lineIndexRef.current = null;
    setActiveLineIndex(null);
  }, []);

  const endSession = useCallback(() => {
    stopRecognition();
    clearHighlight();
  }, [stopRecognition, clearHighlight]);

  const handleTranscript = useCallback((transcript: string) => {
    const lines = splitLyricLines(lyricsTextRef.current);
    const match = findMatchingLineIndex(lines, transcript, lineIndexRef.current);
    if (match == null || match === lineIndexRef.current) return;
    lineIndexRef.current = match;
    setActiveLineIndex(match);
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !enabledRef.current || !youtubeOpenRef.current) return;

    stopRecognition();
    sessionRef.current = true;
    setVoiceSessionActive(true);

    const recognition = new Ctor();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (!sessionRef.current) return;
      const parts: string[] = [];
      const start = Math.max(0, event.results.length - 4);
      for (let i = start; i < event.results.length; i++) {
        parts.push(event.results[i][0].transcript);
      }
      handleTranscript(parts.join(' '));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        endSession();
      }
    };

    recognition.onend = () => {
      if (!sessionRef.current || !enabledRef.current || !youtubeOpenRef.current) return;
      try {
        recognition.start();
      } catch {
        /* reinício pode falhar se já estiver ativo */
      }
    };

    try {
      recognition.start();
    } catch {
      endSession();
    }
  }, [stopRecognition, handleTranscript, endSession]);

  const beginSession = useCallback(() => {
    if (!enabledRef.current || !youtubeOpenRef.current) return;
    autoScrollStartRef.current?.();
    startRecognition();
  }, [startRecognition]);

  const setEnabled = useCallback(
    (value: boolean) => {
      enabledRef.current = value;
      setEnabledState(value);
      if (!value) {
        endSession();
        return;
      }
      if (youtubeOpenRef.current) beginSession();
    },
    [endSession, beginSession]
  );

  const onYoutubePlayerOpen = useCallback(() => {
    youtubeOpenRef.current = true;
    if (enabledRef.current) beginSession();
  }, [beginSession]);

  const onYoutubePlayerClose = useCallback(() => {
    youtubeOpenRef.current = false;
    endSession();
  }, [endSession]);

  const registerAutoScrollStart = useCallback((fn: (() => void) | null) => {
    autoScrollStartRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      supported,
      activeLineIndex,
      voiceSessionActive,
      onYoutubePlayerOpen,
      onYoutubePlayerClose,
      registerAutoScrollStart,
    }),
    [
      enabled,
      setEnabled,
      supported,
      activeLineIndex,
      voiceSessionActive,
      onYoutubePlayerOpen,
      onYoutubePlayerClose,
      registerAutoScrollStart,
    ]
  );

  return <VoiceSyncContext.Provider value={value}>{children}</VoiceSyncContext.Provider>;
}

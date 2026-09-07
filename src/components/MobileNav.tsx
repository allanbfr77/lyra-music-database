'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CloseIcon,
  DownloadIcon,
  InfoIcon,
  LockIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
} from '@/components/icons';
import { createClient } from '@/lib/supabase/browser';
import { ADMIN_HOME } from '@/lib/auth-routes';
import { DEFAULT_THEME, THEME_COLOR, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';
import { requestOfflineSongsDownload } from '@/components/OfflineSongsDownload';
import { isSongCacheDownloadRunning } from '@/lib/song-cache';

function readTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

const SWIPE_CLOSE_MIN_PX = 72;

export default function MobileNav({
  signedIn,
  accountLabel,
  showOfflineDownload = true,
}: {
  signedIn: boolean;
  accountLabel: string;
  showOfflineDownload?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();
  const titleId = useId();
  const drawerId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    tracking: boolean;
    axis: 'h' | 'v' | null;
    startX: number;
    startY: number;
    x: number;
  }>({ tracking: false, axis: null, startX: 0, startY: 0, x: 0 });

  useEffect(() => {
    setMounted(true);
    setTheme(readTheme());
  }, []);

  const close = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setOpen(false);
  }, []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) {
      setDragX(0);
      setDragging(false);
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Arrastar da esquerda para a direita fecha o menu (só com o drawer aberto).
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      dragRef.current = {
        tracking: true,
        axis: null,
        startX: touch.clientX,
        startY: touch.clientY,
        x: 0,
      };
    }

    function onTouchMove(event: TouchEvent) {
      const state = dragRef.current;
      if (!state.tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      if (!state.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        state.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        if (state.axis === 'h') setDragging(true);
      }

      if (state.axis !== 'h') return;
      const next = Math.max(0, dx);
      state.x = next;
      setDragX(next);
      event.preventDefault();
    }

    function onTouchEnd() {
      const state = dragRef.current;
      if (!state.tracking) return;
      const dx = state.x;
      const wasHorizontal = state.axis === 'h';
      state.tracking = false;
      state.axis = null;
      state.x = 0;
      setDragging(false);

      if (!wasHorizontal) {
        setDragX(0);
        return;
      }

      const width = drawerRef.current?.offsetWidth ?? 300;
      const threshold = Math.min(120, Math.max(SWIPE_CLOSE_MIN_PX, width * 0.28));
      if (dx >= threshold) {
        close();
      } else {
        setDragX(0);
      }
    }

    drawer.addEventListener('touchstart', onTouchStart, { passive: true });
    drawer.addEventListener('touchmove', onTouchMove, { passive: false });
    drawer.addEventListener('touchend', onTouchEnd);
    drawer.addEventListener('touchcancel', onTouchEnd);

    return () => {
      drawer.removeEventListener('touchstart', onTouchStart);
      drawer.removeEventListener('touchmove', onTouchMove);
      drawer.removeEventListener('touchend', onTouchEnd);
      drawer.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [open, close]);

  function toggleTheme() {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* sem persistência */
    }
  }

  async function signOut() {
    close();
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  let stagger = 0;
  const nextStagger = () => {
    const value = stagger;
    stagger += 1;
    return value;
  };

  const drawerWidth = typeof window !== 'undefined' ? drawerRef.current?.offsetWidth || 300 : 300;
  const scrimOpacity = open ? Math.max(0, 1 - dragX / Math.max(drawerWidth, 1)) : 0;

  const drawer = mounted
    ? createPortal(
        <div className="no-print">
          <div
            className={`mobile-nav-scrim${open ? ' is-visible' : ''}`}
            onClick={close}
            aria-hidden={!open}
            style={open ? { opacity: scrimOpacity } : undefined}
          />
          <aside
            ref={drawerRef}
            id={drawerId}
            className={`mobile-drawer${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-hidden={!open}
            style={open && dragX > 0 ? { transform: `translateX(${dragX}px)` } : undefined}
            {...(!open ? { inert: true } : {})}
          >
            <div className="mobile-drawer__head">
              <span className="mobile-drawer__title" id={titleId}>
                MENU
              </span>
              <button
                type="button"
                className="mobile-drawer__close"
                onClick={close}
                aria-label="Fechar menu"
                tabIndex={open ? 0 : -1}
              >
                <CloseIcon size={13} />
              </button>
            </div>

            <nav className="mobile-drawer__nav" aria-label="Menu do site">
              {signedIn ? (
                <Link
                  href={ADMIN_HOME}
                  className="mobile-drawer__item mobile-drawer__item--accent"
                  style={{ ['--stagger' as string]: nextStagger() }}
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="mobile-drawer__ic" aria-hidden="true">
                    <ShieldIcon size={15} />
                  </span>
                  <span className="mobile-drawer__txt">
                    <span className="mobile-drawer__main">Admin</span>
                    <span className="mobile-drawer__sub">
                      Online · {accountLabel || 'Conta'}
                    </span>
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="mobile-drawer__item mobile-drawer__item--accent"
                  style={{ ['--stagger' as string]: nextStagger() }}
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="mobile-drawer__ic" aria-hidden="true">
                    <LockIcon size={15} />
                  </span>
                  <span className="mobile-drawer__txt">
                    <span className="mobile-drawer__main">Login</span>
                    <span className="mobile-drawer__sub">Entrar como administrador</span>
                  </span>
                </Link>
              )}

              <button
                type="button"
                className="mobile-drawer__item"
                style={{ ['--stagger' as string]: nextStagger() }}
                onClick={toggleTheme}
                tabIndex={open ? 0 : -1}
              >
                <span className="mobile-drawer__ic" aria-hidden="true">
                  {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                </span>
                <span className="mobile-drawer__txt">
                  <span className="mobile-drawer__main">Tema</span>
                  <span className="mobile-drawer__sub">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                </span>
              </button>

              {showOfflineDownload ? (
                <button
                  type="button"
                  className="mobile-drawer__item"
                  style={{ ['--stagger' as string]: nextStagger() }}
                  onClick={() => {
                    if (isSongCacheDownloadRunning()) {
                      close();
                      return;
                    }
                    requestOfflineSongsDownload();
                    close();
                  }}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="mobile-drawer__ic" aria-hidden="true">
                    <DownloadIcon size={15} />
                  </span>
                  <span className="mobile-drawer__txt">
                    <span className="mobile-drawer__main">Baixar letras e cifras</span>
                    <span className="mobile-drawer__sub">Para abertura rápida no aparelho</span>
                  </span>
                </button>
              ) : null}

              {signedIn ? (
                <button
                  type="button"
                  className="mobile-drawer__item"
                  style={{ ['--stagger' as string]: nextStagger() }}
                  onClick={signOut}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="mobile-drawer__ic" aria-hidden="true">
                    <LogOutIcon size={15} />
                  </span>
                  <span className="mobile-drawer__txt">
                    <span className="mobile-drawer__main">Sair</span>
                    <span className="mobile-drawer__sub">Encerrar sessão</span>
                  </span>
                </button>
              ) : null}

              <div className="mobile-drawer__divider" role="separator" />

              <Link
                href="/integracao"
                className="mobile-drawer__item"
                style={{ ['--stagger' as string]: nextStagger() }}
                onClick={close}
                tabIndex={open ? 0 : -1}
              >
                <span className="mobile-drawer__ic" aria-hidden="true">
                  <InfoIcon size={15} />
                </span>
                <span className="mobile-drawer__txt">
                  <span className="mobile-drawer__main">Sobre o Lyra</span>
                  <span className="mobile-drawer__sub">Versão e informações</span>
                </span>
              </Link>
            </nav>

            <div className="mobile-drawer__footer">lyra.music.db — v1</div>
          </aside>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="mobile-nav no-print">
      <button
        type="button"
        className={`mobile-nav__burger${open ? ' is-open' : ''}`}
        onClick={toggle}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        aria-controls={drawerId}
      >
        <MenuIcon size={16} className="mobile-nav__icon-menu" />
        <CloseIcon size={16} className="mobile-nav__icon-close" />
      </button>
      {drawer}
    </div>
  );
}

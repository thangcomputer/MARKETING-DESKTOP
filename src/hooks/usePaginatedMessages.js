/**
 * usePaginatedMessages.js — Infinite scroll pagination for chat history
 *
 * HOW IT WORKS (like Zalo/Messenger):
 *  1. On mount: loads the latest 50 messages
 *  2. On scroll to top: loads 50 more (older) messages
 *  3. New live messages via WebSocket are appended at the bottom
 *
 * Usage:
 *   const { messages, loadOlder, hasMore, isLoading } = usePaginatedMessages(conversationId);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

const PAGE_SIZE = 50;

export function usePaginatedMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const loadedConvId = useRef(null);

  // ── Reset when conversation changes ─────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setIsInitialized(false);
    loadedConvId.current = conversationId;
  }, [conversationId]);

  // ── Load initial batch (latest 50) ──────────────────────────
  useEffect(() => {
    if (!conversationId || isInitialized) return;

    let cancelled = false;
    setIsLoading(true);

    api.get(`/conversations/${conversationId}/messages`, {
      params: { skip: 0, take: PAGE_SIZE },
    })
      .then(({ data }) => {
        if (cancelled || loadedConvId.current !== conversationId) return;
        setMessages(data.messages || []);
        setHasMore((data.messages?.length ?? 0) >= PAGE_SIZE);
        setPage(1);
        setIsInitialized(true);
      })
      .catch((err) => {
        if (!cancelled) console.error('[usePaginatedMessages] Initial load failed', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [conversationId, isInitialized]);

  // ── Load older messages (infinite scroll up) ─────────────────
  const loadOlder = useCallback(() => {
    if (isLoading || !hasMore || !conversationId || !isInitialized) return;

    setIsLoading(true);
    const skip = page * PAGE_SIZE;

    api.get(`/conversations/${conversationId}/messages`, {
      params: { skip, take: PAGE_SIZE },
    })
      .then(({ data }) => {
        if (loadedConvId.current !== conversationId) return;
        const older = data.messages || [];
        setMessages((prev) => [...older, ...prev]); // prepend older msgs
        setHasMore(older.length >= PAGE_SIZE);
        setPage((p) => p + 1);
      })
      .catch((err) => {
        console.error('[usePaginatedMessages] Load older failed', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [conversationId, page, isLoading, hasMore, isInitialized]);

  // ── Append new real-time messages from WebSocket ─────────────
  const appendMessage = useCallback((msg) => {
    setMessages((prev) => {
      // Dedup by id
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  return {
    messages,
    loadOlder,
    hasMore,
    isLoading,
    appendMessage,
  };
}

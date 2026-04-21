// src/hooks/useChatConnection.js
import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

/**
 * useChatConnection(token, options?)
 *
 * options:
 *   - hubUrl?: string                // absolute URL to your chat hub
 *   - tokenStorageKey?: string       // localStorage key for JWT (default: "mahima_token")
 *   - logLevel?: signalR.LogLevel    // default: Warning
 *
 * Returns:
 *   { connection, isConnected, on, off, invoke, joinGroup, leaveGroup }
 */
export function useChatConnection(token, options = {}) {
  const {
    hubUrl: hubUrlOverride,
    tokenStorageKey = "mahima_token",
    logLevel = signalR.LogLevel.Warning,
  } = options;

  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef(new Map());
  const startedConnRef = useRef(null);

  // Resolve hub URL
  function resolveHubUrl() {
    if (hubUrlOverride) return hubUrlOverride;

    // Prefer VITE_HUB_BASE if provided (e.g., http://localhost:5001/hubs)
    let hubBase =
      (import.meta?.env?.VITE_HUB_BASE || "").toString().trim().replace(/\/+$/, "");

    if (!hubBase) {
      // Fallback: derive from VITE_API_BASE by removing trailing /api
      let apiBase = (import.meta?.env?.VITE_API_BASE || "").toString().trim();
      apiBase = apiBase.replace(/\/+$/, "");
      if (apiBase.toLowerCase().endsWith("/api")) {
        hubBase = apiBase.slice(0, -4) + "/hubs";
      } else if (apiBase) {
        hubBase = apiBase + "/hubs";
      } else {
        // same-origin fallback
        hubBase = "/hubs";
      }
    }

    // Default hub path is /chat → final URL like http://host:5001/hubs/chat
    const path =
      (import.meta?.env?.VITE_CHAT_HUB_PATH || "/chat").toString().trim();
    return `${hubBase.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  // Build a HubConnection with supplied options
  const buildConnection = useCallback(
    ({ skipNegotiation = false, transport } = {}) => {
      const url = resolveHubUrl();

      const withUrlOptions = {
        accessTokenFactory: () => {
          try {
            const tk =
              token ||
              window.localStorage.getItem(tokenStorageKey) ||
              "";
            return tk;
          } catch {
            return token || "";
          }
        },
        skipNegotiation,
      };
      if (transport) withUrlOptions.transport = transport;

      return new signalR.HubConnectionBuilder()
        .withUrl(url, withUrlOptions)
        .withAutomaticReconnect()
        .configureLogging(logLevel)
        .build();
    },
    [token, tokenStorageKey, logLevel, hubUrlOverride]
  );

  // Start/stop lifecycle
  useEffect(() => {
    // If no token, ensure we are stopped
    if (!token) {
      if (startedConnRef.current) {
        startedConnRef.current.stop().catch(() => {});
      }
      startedConnRef.current = null;
      setConnection(null);
      setIsConnected(false);
      return;
    }

    let mounted = true;

    const start = async () => {
      // Attempt #1: normal negotiation
      let conn = buildConnection({ skipNegotiation: false });
      try {
        await conn.start();
        if (!mounted) {
          await conn.stop().catch(() => {});
          return;
        }
        startedConnRef.current = conn;
        setConnection(conn);
        setIsConnected(true);
      } catch (err) {
        // Attempt #2: fallback to WebSockets only (skip negotiation)
        try {
          await conn.stop().catch(() => {});
        } catch {}

        conn = buildConnection({
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        });

        try {
          await conn.start();
          if (!mounted) {
            await conn.stop().catch(() => {});
            return;
          }
          startedConnRef.current = conn;
          setConnection(conn);
          setIsConnected(true);
        } catch (err2) {
          setIsConnected(false);
          setConnection(null);
        }
      }

      // Wire reconnect/close
      if (startedConnRef.current) {
        startedConnRef.current.onreconnected(() => setIsConnected(true));
        startedConnRef.current.onclose(() => setIsConnected(false));
      }
    };

    start();

    return () => {
      mounted = false;
      (async () => {
        try {
          if (startedConnRef.current) {
            await startedConnRef.current.stop();
          }
        } catch {}
        startedConnRef.current = null;
        setConnection(null);
        setIsConnected(false);
      })();
    };
  }, [token, buildConnection]);

  // Event helpers
  const on = useCallback(
    (event, handler) => {
      if (!connection) return;
      connection.on(event, handler);
      handlersRef.current.set(event, handler);
    },
    [connection]
  );

  const off = useCallback(
    (event) => {
      if (!connection) return;
      const h = handlersRef.current.get(event);
      if (h) {
        connection.off(event, h);
        handlersRef.current.delete(event);
      } else {
        // Fallback: remove any handler for that event
        connection.off(event);
      }
    },
    [connection]
  );

  const invoke = useCallback(
    async (method, ...args) => {
      if (!connection) throw new Error("SignalR not connected");
      return connection.invoke(method, ...args);
    },
    [connection]
  );

  const joinGroup = useCallback(
    async (chatId) => {
      if (!connection || chatId == null) return;
      try {
        // Adjust the server method name if your hub differs
        if (connection.invoke) {
          await connection.invoke("JoinGroup", String(chatId));
        } else if (connection.send) {
          await connection.send("JoinGroup", String(chatId));
        }
      } catch (e) {
        // swallow
      }
    },
    [connection]
  );

  const leaveGroup = useCallback(
    async (chatId) => {
      if (!connection || chatId == null) return;
      try {
        if (connection.invoke) {
          await connection.invoke("LeaveGroup", String(chatId));
        } else if (connection.send) {
          await connection.send("LeaveGroup", String(chatId));
        }
      } catch (e) {
        // swallow
      }
    },
    [connection]
  );

  return { connection, isConnected, on, off, invoke, joinGroup, leaveGroup };
}

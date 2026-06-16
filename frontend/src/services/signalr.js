/**
 * SignalR real-time service for chat
 * Hub: /hubs/chat
 */

import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '../config';

let connection = null;
const listeners = {};

export function getConnection() { return connection; }

export async function startSignalR(token) {
  if (connection && connection.state === signalR.HubConnectionState.Connected) return;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_HUB_URL, {
      accessTokenFactory: () => token,
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // Wire up registered listeners after reconnect
  connection.onreconnected(() => {
    console.info('[SignalR] Reconnected');
    Object.entries(listeners).forEach(([event, fns]) =>
      fns.forEach((fn) => connection.on(event, fn))
    );
  });

  connection.onclose(() => console.info('[SignalR] Disconnected'));

  try {
    await connection.start();
    console.info('[SignalR] Connected');
  } catch (err) {
    console.error('[SignalR] Connection failed:', err);
  }
}

export async function stopSignalR() {
  if (connection) {
    await connection.stop();
    connection = null;
  }
}

export function onMessage(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
  if (connection) connection.on(event, handler);
  return () => offMessage(event, handler);
}

export function offMessage(event, handler) {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter((fn) => fn !== handler);
  }
  if (connection) connection.off(event, handler);
}

export async function invokeHub(method, ...args) {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    throw new Error('SignalR not connected');
  }
  return connection.invoke(method, ...args);
}

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected'

export interface WebSocketEvent<T = unknown> {
  channel: string
  payload: T
  timestamp: string
}

type EventCallback<T = unknown> = (payload: T) => void
type StateCallback = (state: ConnectionState) => void

export class WebSocketClient {
  private static instance: WebSocketClient | null = null
  private url: string | null = null
  private ws: WebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private listeners: Map<string, Set<EventCallback<any>>> = new Map()
  private stateListeners: Set<StateCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private simulatedInterval: ReturnType<typeof setInterval> | null = null

  private constructor() {
    // Default simulated mode when no backend URL is set
    this.startSimulatedTelemetry()
  }

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient()
    }
    return WebSocketClient.instance
  }

  public connect(url?: string) {
    if (url) this.url = url
    if (!this.url) {
      this.setState('connected')
      return
    }

    this.setState('connecting')

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.setState('connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WebSocketEvent
          if (parsed && parsed.channel) {
            this.emit(parsed.channel, parsed.payload)
          }
        } catch {
          // ignore non-json messages
        }
      }

      this.ws.onclose = () => {
        this.stopHeartbeat()
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('disconnected')
      return
    }

    this.setState('reconnecting')
    this.reconnectAttempts++
    const delay = Math.min(this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts), 15000)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  public subscribe<T = unknown>(channel: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
    }
    this.listeners.get(channel)!.add(callback)

    return () => {
      const set = this.listeners.get(channel)
      if (set) {
        set.delete(callback)
        if (set.size === 0) {
          this.listeners.delete(channel)
        }
      }
    }
  }

  public emit<T = unknown>(channel: string, payload: T) {
    const callbacks = this.listeners.get(channel)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload)
        } catch (err) {
          console.error(`Error in WebSocket channel listener for ${channel}:`, err)
        }
      })
    }
  }

  public onStateChange(callback: StateCallback): () => void {
    this.stateListeners.add(callback)
    callback(this.state)
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  public getState(): ConnectionState {
    return this.state
  }

  private setState(state: ConnectionState) {
    this.state = state
    this.stateListeners.forEach((cb) => cb(state))
  }

  /**
   * Generates periodic realistic simulated events for testing
   * when running in frontend-only mock mode.
   */
  private startSimulatedTelemetry() {
    this.setState('connected')

    // Periodic heartbeat simulator
    this.simulatedInterval = setInterval(() => {
      this.emit('system.heartbeat', {
        serverTime: new Date().toISOString(),
        load: Math.floor(20 + Math.random() * 25),
      })
    }, 20000)
  }

  public destroy() {
    this.stopHeartbeat()
    if (this.simulatedInterval) clearInterval(this.simulatedInterval)
    if (this.ws) this.ws.close()
    this.listeners.clear()
    this.stateListeners.clear()
  }
}

export const wsClient = WebSocketClient.getInstance()

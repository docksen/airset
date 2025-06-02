const isNodeJSEnv = typeof process !== 'undefined' && Boolean(process.versions?.node)
const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined'

const TYPE_STYLE = 'background:#000;color:#fff'
const NAME_STYLE = 'color:#f44;font-weight:600'

export type Listener = (...args: any[]) => any

export interface EmitterOptions {
  /** 是否开启调试模式（若开启，则会在抛事件的时候，将数据打印出来） */
  debug?: boolean
}

export class Emitter {
  private _eventToListeners: Map<string, Map<Listener, number>>

  /**
   * 是否开启调试模式（若开启，则会在抛事件的时候，将数据打印出来）
   */
  public debug?: boolean

  constructor(options: EmitterOptions = {}) {
    this.debug = options.debug
    this._eventToListeners = new Map()
  }

  /**
   * 注册事件监听器
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   * @param {Number} count 监听事件的次数
   */
  public on(event: string, listener: Listener, count: number = 0): void {
    let listeners = this._eventToListeners.get(event)
    if (!listeners) {
      listeners = new Map<Listener, number>()
      this._eventToListeners.set(event, listeners)
    }
    listeners.set(listener, count)
  }

  /**
   * 注册事件监听器（只监听一次）
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   */
  public once(event: string, listener: Listener): void {
    this.on(event, listener, 1)
  }

  /**
   * 移除事件监听器
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   */
  public off(event?: string, listener?: Listener): void {
    if (event) {
      const listeners = this._eventToListeners.get(event)
      if (listeners) {
        if (listener) {
          listeners.delete(listener)
        } else {
          this._eventToListeners.delete(event)
        }
      }
    } else {
      this._eventToListeners = new Map()
    }
  }

  /**
   * 发布事件
   *
   * @param {String} event 事件类型
   * @param {...any} args 监听的回调参数
   */
  public emit(event: string, ...args: any): void {
    if (this.debug) {
      if (isBrowserEnv) {
        console.log(`%c ${this.constructor.name} %c ${event}`, TYPE_STYLE, NAME_STYLE, ...args)
      } else if (isNodeJSEnv) {
        console.log(`\x1B[35m${this.constructor.name}\x1B[0m \x1B[33m${event}\x1B[0m`, ...args)
      } else {
        console.log(`[${this.constructor.name}] ${event}`, ...args)
      }
    }
    const listeners = this._eventToListeners.get(event)
    if (listeners) {
      for (const [listener, count] of listeners) {
        listener(...args)
        if (count >= 1) {
          if (count === 1) {
            listeners.delete(listener)
          } else {
            listeners.set(listener, count - 1)
          }
        }
      }
    }
  }
}

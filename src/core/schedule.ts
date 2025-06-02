import { Emitter, EmitterOptions, Listener } from './emitter'

/**
 * 任务帧时长（单位：毫秒）
 */
const FRAME_MILLIS = 10

type SetNextFrame = {
  (callback: (_: void) => void): void
  <TArgs extends any[]>(callback: (...args: TArgs) => void, ...args: TArgs): void
}

let setNextFrame: SetNextFrame
if (typeof setImmediate === 'function') {
  setNextFrame = setImmediate
} else if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel()
  setNextFrame = <TArgs extends any[]>(callback: (...args: TArgs) => void, ...args: TArgs) => {
    channel.port1.onmessage = () => {
      channel.port1.onmessage = null
      callback(...args)
    }
    channel.port2.postMessage(null)
  }
} else {
  setNextFrame = <TArgs extends any[]>(callback: (...args: TArgs) => void, ...args: TArgs) => {
    return setTimeout(callback, 0, ...args)
  }
}

export enum ScheduleEvent {
  /** 开始任务帧之前 */
  START_BEFORE = 'startBefore',
  /** 结束任务帧之后 */
  END_AFTER = 'endAfter',
  /** 销毁之前 */
  DESTROY_BEFORE = 'destroyBefore'
}

export interface ScheduleOptions extends EmitterOptions {
  /** 开始任务帧之前执行此方法 */
  onStartBefore?: Listener
  /** 结束任务帧之后执行此方法 */
  onEndAfter?: Listener
  /** 销毁之前执行此方法 */
  onDestroyBefore?: Listener
}

export type ScheduleTask<TResult> = () => Promise<TResult> | TResult

export class Schedule extends Emitter {
  protected _taskList: (() => Promise<void> | void)[]

  protected _running: boolean

  constructor(options: ScheduleOptions = {}) {
    super()
    this._taskList = []
    this._running = false
    if (options.onStartBefore) {
      this.on(ScheduleEvent.START_BEFORE, options.onStartBefore)
    }
    if (options.onEndAfter) {
      this.on(ScheduleEvent.END_AFTER, options.onEndAfter)
    }
    if (options.onDestroyBefore) {
      this.once(ScheduleEvent.DESTROY_BEFORE, options.onDestroyBefore)
    }
  }

  /**
   * 销毁资源
   */
  public destroy(): void {
    this.emit(ScheduleEvent.DESTROY_BEFORE)
    this.off()
    this._running = false
    this._taskList = []
  }

  /**
   * 添加任务
   */
  public pushTask<TResult>(task: ScheduleTask<TResult>): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this._taskList.push(() => {
        try {
          const result = task()
          if (result instanceof Promise) {
            return result.then(resolve).catch(reject)
          } else {
            resolve(result)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  /**
   * 添加多个任务
   */
  public pushTaskList(tasks: ScheduleTask<any>[]): Promise<any[]> {
    const promises: Promise<any>[] = []
    for (const task of tasks) {
      promises.push(this.pushTask(task))
    }
    return Promise.all(promises)
  }

  /**
   * 执行任务（每隔 10ms，就会暂停一下，等下一次事件循环唤醒后继续）
   */
  public async execute(): Promise<void> {
    if (this._running || this._taskList.length === 0) {
      return
    }
    this.emit(ScheduleEvent.START_BEFORE)
    this._running = true
    let hasError = false
    let index = 0
    try {
      const startTime = Date.now()
      for (; index < this._taskList.length; index++) {
        if (index > 0 && Date.now() - startTime > FRAME_MILLIS) {
          break
        }
        const task = this._taskList[index]
        if (task) {
          await task()
        }
      }
    } catch (error) {
      hasError = true
      throw error
    } finally {
      this._running = false
      this.emit(ScheduleEvent.END_AFTER)
      if (index < this._taskList.length) {
        this._taskList = this._taskList.slice(index)
        if (!hasError) {
          setNextFrame(() => this.execute())
        }
      } else {
        this._taskList = []
      }
    }
  }
}

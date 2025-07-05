import { Emitter, EmitterOptions, Listener } from './emitter'
import { Schedule } from './schedule'
import { deepUpdate } from 'utils/updaters'
import { ComparatorSupplier } from 'utils/comparators'
import { deepClone, shallowClone } from 'utils/replicators'
import { setByJsonNodes, toJsonNodes } from 'utils/object'

export enum StoreEvent {
  /** 创建之后 */
  CREATE_AFTER = 'createAfter',
  /** 更新之前 */
  UPDATE_BEFORE = 'updateBefore',
  /** 更新之后 */
  UPDATE_AFTER = 'updateAfter',
  /** 渲染之后（创建&更新之后） */
  RENDER_AFTER = 'renderAfter',
  /** 销毁之前 */
  DESTROY_BEFORE = 'destroyBefore'
}

export interface StoreOptions extends EmitterOptions {
  /** 历史记录长度，范围是 3 到 100 条，默认 10 条 */
  maxLength?: number
  /** 对比方法的供应器 */
  comparatorSupplier?: ComparatorSupplier
  /** 监听创建之后的事件 */
  onCreateAfter?: Listener
  /** 监听更新之前的事件 */
  onUpdateBefore?: Listener
  /** 监听更新之后的事件 */
  onUpdateAfter?: Listener
  /** 监听渲染之后（创建&更新之后）的事件 */
  onRenderAfter?: Listener
  /** 监听销毁之前的事件 */
  onDestroyBefore?: Listener
}

export type Data<S extends Store<any>> = S extends Store<infer D> ? D : any

export interface StoreTaskContext<S extends Store<any>> extends Record<string, any> {
  /** 要修改的数据 */
  data: Data<S>
  /** 状态管理器 */
  store: S
  /** 在任务执行期间，更新数据 */
  update: () => boolean
  /** 在任务执行期间，是否更新了数据 */
  updated?: boolean
}

export type StoreTask<S extends Store<any>> = (ctx: StoreTaskContext<S>) => Promise<any> | any

export abstract class Store<D extends object> extends Emitter {
  /**
   * 更新次数
   */
  protected _count: number

  /**
   * 当前数据在历史记录中的下标
   */
  protected _index: number

  /**
   * 历史记录
   */
  protected _history: D[]

  /**
   * 历史记录最大容量
   */
  protected _maxLength: number

  /**
   * 任务计划表（负责管理任务）
   */
  protected _schedule: Schedule

  /**
   * 缓存数据（用于更新数据）
   */
  protected _cachedData: D | undefined

  /**
   * 任务上下文对象（用于任务间信息传递，和更新数据）
   */
  protected _taskContext: StoreTaskContext<this> | undefined

  /**
   * 原始数据（用于重置数据）
   */
  public originalData: D

  /**
   * 对比方法的供应器
   */
  public comparatorSupplier: ComparatorSupplier | undefined

  constructor(data: D, options: StoreOptions = {}) {
    super(options)
    this._count = 0
    this._index = 0
    this._history = [data]
    this._maxLength = options.maxLength ? Math.min(Math.max(options.maxLength, 3), 100) : 10
    this._schedule = new Schedule({
      debug: options.debug,
      onStartBefore: () => {
        if (!this._taskContext) {
          this._taskContext = {
            data: deepClone(this._cachedData ?? this.data) as any,
            store: this,
            update: () => {
              if (this._taskContext) {
                const newData = deepClone(this._taskContext.data)
                const updated = this.update(newData)
                this._taskContext.updated = this._taskContext.updated || updated
                return updated
              } else {
                return false
              }
            }
          }
        }
      },
      onEndAfter: () => {
        if (this._taskContext) {
          this.update(this._taskContext.data)
          this._taskContext = undefined
        }
      }
    })
    this._cachedData = undefined
    this._taskContext = undefined
    this.originalData = data
    this.comparatorSupplier = options.comparatorSupplier
    if (options.onCreateAfter) {
      this.once(StoreEvent.CREATE_AFTER, options.onCreateAfter)
    }
    if (options.onUpdateBefore) {
      this.on(StoreEvent.UPDATE_BEFORE, options.onUpdateBefore)
    }
    if (options.onUpdateAfter) {
      this.on(StoreEvent.UPDATE_AFTER, options.onUpdateAfter)
    }
    if (options.onRenderAfter) {
      this.on(StoreEvent.RENDER_AFTER, options.onRenderAfter)
    }
    if (options.onDestroyBefore) {
      this.once(StoreEvent.DESTROY_BEFORE, options.onDestroyBefore)
    }
  }

  /**
   * 销毁资源
   */
  protected destroy(): void {
    this.emit(StoreEvent.DESTROY_BEFORE, this.data)
    this.off()
    this._schedule.destroy()
    this._history = undefined as any
    this._schedule = undefined as any
    this._cachedData = undefined as any
    this._taskContext = undefined as any
    this.originalData = undefined as any
    this.comparatorSupplier = undefined as any
  }

  /**
   * 当前数据
   */
  public get data(): D {
    return this._history[this._index]
  }

  /**
   * 上一条数据
   */
  public get prevData(): D {
    const prevIndex = this._index - 1
    if (prevIndex < 0) {
      throw new Error('Exceeded history boundary, cannot get previous data.')
    }
    return this._history[prevIndex]
  }

  /**
   * 下一条数据
   */
  public get nextData(): D {
    const nextIndex = this._index + 1
    if (nextIndex >= this._history.length) {
      throw new Error('Exceeded history boundary, cannot get next data.')
    }
    return this._history[nextIndex]
  }

  /**
   * 更新的次数
   */
  public get updatedCount(): number {
    return this._count
  }

  /**
   * 当前数据在历史记录中的下标
   */
  public get historyIndex(): number {
    return this._index
  }

  /**
   * 历史记录的长度
   */
  public get historyLength(): number {
    return this._history.length
  }

  protected abstract apply(updated: boolean): void

  /**
   * 跳转到历史记录中指定位置的数据
   *
   * - 在超长的情况下，Store 会舍弃 history 部分头部数据，所以 go(0) 获得的不一定是初始数据
   * - 若要获取初始数据，请使用 originData
   * - 若超过历史记录的长度，则跳转行为不会生效
   */
  public go(index: number): boolean {
    if (index === this._index) {
      return false
    }
    if (index < 0 || index >= this._history.length) {
      return false
    }
    this._index = index
    this._count = this._count + 1
    this._cachedData = undefined
    this.apply(true)
    return true
  }

  /**
   * 跳转到上一条数据
   *
   * - 若没有上一条数据，则跳转行为不会生效
   */
  public back(): boolean {
    return this.go(this._index - 1)
  }

  /**
   * 跳转到下一条数据
   *
   * - 若没有下一条数据，则跳转行为不会生效
   */
  public forward(): boolean {
    return this.go(this._index + 1)
  }

  /**
   * 重置数据
   *
   * - 若指定了参数 data，则用此参数进行重置
   * - 若没有指定参数 data，则使用 originData 进行重置
   * - 重置之后，originData 会被设置为此次所用的参数
   *
   * @param data 用于重置的数据
   */
  public reset(data?: D): boolean {
    const newData = data ?? this.originalData
    this._index = 0
    this._count = this._count + 1
    this._history = [newData]
    this._cachedData = undefined
    this.originalData = newData
    this.apply(true)
    return true
  }

  /**
   * 刷新页面（用缓存数据去更新页面）
   *
   * - 如果 force 指定为 true，则直接刷新页面，不修改当前数据
   * - 如果没有缓存数据，则不更新
   * - 如果缓存数据和当前数据之间没有差异，则不更新
   * - 如果缓存数据和当前数据之间有差异，对没有差异的部分保持原引用，对有差异的部分进行更新
   * - 可以通过 comparatorSupplier 获取比较方法，由比较方法来决定两个数据是否有差异
   *
   * @param force 不更新数据，直接刷新页面
   * @returns 是否刷新了页面
   */
  public refresh(force?: boolean): boolean {
    if (force) {
      this.apply(false)
      return true
    }
    const newData = this._cachedData
    if (newData === undefined) {
      return false
    }
    this._cachedData = undefined
    const result = deepUpdate(this.data, newData, this.comparatorSupplier)
    if (result[0]) {
      return false
    }
    if (this._index < this._history.length - 1) {
      this._history.push(this._history[this._index])
    }
    this._history.push(result[1])
    if (this._history.length > this._maxLength) {
      this._history = this._history.slice(this._history.length - this._maxLength + 2)
    }
    this._index = this._history.length - 1
    this._count = this._count + 1
    this.apply(true)
    return true
  }

  /**
   * 执行任务列表
   *
   * - 可以直接在任务中，修改 ctx.data
   * - 任务结束后，ctx.data 会被用于更新
   *
   * @param tasks 多个任务
   * @returns 任务上下文
   */
  public async execute(
    ...tasks: (StoreTask<this> | undefined)[]
  ): Promise<StoreTaskContext<this> | undefined> {
    let promise: Promise<any> | undefined = undefined
    let result: StoreTaskContext<this> | undefined = this._taskContext
    for (const task of tasks) {
      if (task) {
        promise = this._schedule.pushTask(() => {
          if (this._taskContext) {
            result = this._taskContext
            return task(this._taskContext)
          }
        })
      }
    }
    if (promise) {
      this._schedule.execute()
      await promise
    }
    return result
  }

  /**
   * 设置缓存数据（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据并刷新页面，请使用 update 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param data 缓存数据
   * @returns this
   */
  public set(data?: D): this {
    this._cachedData = data
    return this
  }

  /**
   * 更新当前数据，并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param data 缓存数据
   * @returns this
   */
  public update(data?: D): boolean {
    this.set(data)
    return this.refresh()
  }

  /**
   * 设置缓存数据中的部分浅层字段（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据中的部分浅层字段并刷新页面，请使用 updatePart 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param partData 缓存数据中的部分浅层字段
   * @returns this
   */
  public setPart(partData: Partial<D>): this {
    if (this._cachedData === undefined) {
      this._cachedData = shallowClone(this.data)
    }
    const anyData: any = this._cachedData
    for (const key of Object.keys(partData)) {
      anyData[key] = (partData as any)[key]
    }
    return this
  }

  /**
   * 更新当前数据中的部分浅层字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param partData 缓存数据中的部分浅层字段
   * @returns this
   */
  public updatePart(partData: Partial<D>): boolean {
    this.setPart(partData)
    return this.refresh()
  }

  /**
   * 设置缓存数据中的某个浅层字段（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据中的某个浅层字段并刷新页面，请使用 updateItem 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param key 浅层字段名
   * @param value 浅层字段值
   * @returns this
   */
  public setItem(key: keyof D, value: D[keyof D]): this {
    if (this._cachedData === undefined) {
      this._cachedData = shallowClone(this.data)
    }
    this._cachedData[key] = value
    return this
  }

  /**
   * 更新当前数据中的某个浅层字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param key 浅层字段名
   * @param value 浅层字段值
   * @returns this
   */
  public updateItem(key: keyof D, value: D[keyof D]): boolean {
    this.setItem(key, value)
    return this.refresh()
  }

  /**
   * 设置缓存数据中的某个路径下的字段（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据中的某个路径下的字段并刷新页面，请使用 updateItem 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param path 字段路径
   * @param value 字段值
   * @returns this
   */
  public setPath(path: string, value: any): this {
    const nodes = toJsonNodes(path)
    if (nodes.length === 0) {
      return this
    }
    if (nodes.length === 1) {
      this.setItem(path as any, value)
      return this
    }
    if (this._cachedData === undefined) {
      this._cachedData = shallowClone(this.data)
    }
    const anyKey = nodes[0]
    const anyData: any = this._cachedData
    anyData[anyKey] = setByJsonNodes(anyData[anyKey], nodes.slice(1), value)
    return this
  }

  /**
   * 更新当前数据中的某个路径下的字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param path 字段路径
   * @param value 字段值
   * @returns this
   */
  public updatePath(path: string, value: any): boolean {
    this.setPath(path, value)
    return this.refresh()
  }
}

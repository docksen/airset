import React, {
  PropsWithChildren,
  useState,
  useEffect,
  Context,
  Dispatch,
  SetStateAction
} from 'react'
import { StoreEvent } from './constants'
import { StoreOptions, SetDataOptions, Task, TaskContext } from './declaration'
import { ensDataContext, ensStoreContext } from './contexts'
import { deepUpdate } from 'utils/updaters'
import { Comparator } from 'utils/comparators'
import { deepClone } from 'utils/replicators'

export class Store<D extends object> {
  /**
   * 是否开启debug
   */
  debug?: boolean

  /**
   * 默认数据
   */
  defaultData: D

  /**
   * 比对算法
   */
  // defaultCompare: Comparator

  /**
   * 上一次数据
   */
  private _prevData?: D

  /**
   * 数据
   */
  private _data: D

  /**
   * 设置当前数据
   */
  private _setData: Dispatch<SetStateAction<D>>

  /**
   * 是否已被使用
   */
  private _used?: boolean

  /**
   * 是否处于运行态
   */
  private _running: boolean = false

  /**
   * 等待列表
   */
  private _waiterList: (() => void)[] = []

  /**
   * 是否已创建完成
   */
  protected _created: boolean = false

  /**
   * 更新次数（初始为0）
   */
  protected _updateCount: number

  /**
   * React Store Context
   */
  private _storeContext: Context<this>

  /**
   * React Data Context
   */
  private _dataContext: Context<D>

  /**
   * 上一次数据
   */
  get prevData(): D | undefined {
    return this._prevData
  }

  /**
   * 数据
   */
  get data(): D {
    return this._data
  }

  constructor(defaultData: D, options: StoreOptions = {}) {
    this.debug = options.debug
    this.defaultData = defaultData
    this._updateCount = 0
    this._data = defaultData
    this._setData = () => {}
    this._dataContext = ensDataContext(this.constructor as any) as any
    this._storeContext = ensStoreContext(this.constructor as any)
    const compare = options.compare
    if (compare && typeof compare === 'string') {
      // this.defaultCompare = COMPARATORS[compare]
    } else {
      // this.defaultCompare = compare ?? COMPARATORS.shallowEqual
    }
  }

  emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
    if (this.debug) {
      console.log(
        `%c ${this.constructor.name} %c ${String(event)}`,
        'background:#000;color:#fff',
        'color:#f44;font-weight:600',
        ...args
      )
    }
    // return super.emit(event, ...args)
  }

  /**
   * 设置数据
   */
  set(data: D, options: SetDataOptions = {}): boolean {
    // 对比是否有改动，若无，则不继续
    let compare: Comparator | undefined
    if (options.compare === undefined) {
      compare = this.defaultCompare
    } else if (options.compare === null) {
      compare = undefined
    } else if (typeof options.compare === 'string') {
      // compare = COMPARATORS[options.compare]
    } else {
      // compare = options.compare
    }
    if (compare && compare(data, this._data)) {
      return false
    }
    // 准备更新
    const prevData = this._data
    this.emit(StoreEvent.UPDATE_BEFORE, { data, prevData, store: this })
    this._prevData = prevData
    this._data = data
    // 更新页面
    this._updateCount += 1
    this._setData(data)
    return true
  }

  /**
   * 重置数据
   */
  reset(partData?: Partial<D>, options?: SetDataOptions): boolean {
    const data = { ...this.defaultData, ...partData }
    const isUpdated = this.set(data, options)
    if (isUpdated) {
      this.defaultData = data
    }
    return isUpdated
  }

  /**
   * 设置部分数据
   */
  setPart(partData: Partial<D>, options?: SetDataOptions): boolean {
    return this.set({ ...this._data, ...partData }, options)
  }

  /**
   * 更新数据（尽可能使用旧数据）
   */
  update(data: D): boolean {
    const [newData, isEqual] = deepUpdate(this.data, data)
    if (isEqual) {
      return false
    }
    // return this.set(newData, { compare: null })
  }

  /**
   * 更新部分数据（尽可能使用旧数据）
   */
  updatePart(partData: Partial<D>): boolean {
    return this.update({ ...this._data, ...partData })
  }

  /**
   * 复制
   */
  clone(data?: D): D {
    return deepClone(data === undefined ? this._data : data)
  }

  /**
   * 执行任务列表
   * @note 可以直接在任务中修改 ctx.data
   * @note 任务结束后，ctx.data 会被赋值给 store.data
   */
  async run(...tasks: (Task<this> | undefined)[]): Promise<TaskContext<this>> {
    if (this._running) {
      await new Promise<void>(resolve => {
        this._waiterList.push(resolve)
      })
    }
    try {
      this._running = true
      const ctx: TaskContext<this> = {
        store: this,
        data: this.clone() as any,
        prevData: this.prevData as any,
        update: () => {
          const newData = this.clone(ctx.data)
          const updated = this.update(newData)
          ctx.updated = ctx.updated || updated
          return updated
        }
      }
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        if (task) {
          await task(ctx)
        }
      }
      const updated = this.update(ctx.data)
      ctx.updated = ctx.updated || updated
      return ctx
    } catch (err) {
      throw err
    } finally {
      const waiter = this._waiterList.shift()
      if (waiter) {
        waiter()
      } else {
        this._running = false
      }
    }
  }

  /**
   * 用 useState 的方式，使用 Store
   */
  readonly useStoreState = (): [D, this] => {
    const [data, setData] = useState<D>(this.defaultData)
    this._data = data
    this._setData = setData
    // 若该实例已经在其他地方使用过，则需要警告提示
    // 在组件被卸载时, 要清除事件
    useEffect(() => {
      if (this._used) {
        throw new Error('') // 数据存在多处供应点
      } else {
        this._used = true
      }
      return () => {
        this.emit(StoreEvent.DESTROY_BEFORE, {
          data: this._data,
          store: this
        })
        // this.removeAllListeners()
        this._updateCount === 0
        this._data = this.defaultData
        this._prevData = undefined
        this._setData = () => {}
      }
    }, [])
    // 生命周期机制
    useEffect(() => {
      if (!this._created) {
        this._created = true
        this.emit(StoreEvent.CREATED, {
          data: this._data,
          store: this
        })
      } else {
        this.emit(StoreEvent.UPDATED, {
          data: this._data,
          store: this
        })
      }
      this.emit(StoreEvent.RENDERED, { data: this._data, store: this })
    }, [this._updateCount])
    return [data, this]
  }

  /**
   * Context 供应器
   */
  readonly Provider = ({ children }: PropsWithChildren<{}>) => {
    const [data] = this.useStoreState()
    const DataProvider = this._dataContext.Provider
    const StoreProvider = this._storeContext.Provider
    return (
      <StoreProvider value={this}>
        <DataProvider value={data}>{children}</DataProvider>
      </StoreProvider>
    )
  }
}

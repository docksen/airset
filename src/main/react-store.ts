import { createElement, useEffect, useState } from 'react'
import { Store, StoreEvent, StoreOptions } from 'core/store'
import { getDataContext, getStoreContext, NOOP } from './react-contexts'
import type { Context, Dispatch, PropsWithChildren, SetStateAction } from 'react'

export class ReactStore<D extends object> extends Store<D> {
  protected _used?: boolean

  protected _value: boolean

  protected _setValue: Dispatch<SetStateAction<boolean>>

  protected _dataContext: Context<D>

  protected _storeContext: Context<this>

  constructor(data: D, options?: StoreOptions) {
    super(data, options)
    this._value = false
    this._setValue = NOOP
    this._dataContext = getDataContext(this.constructor as any)
    this._storeContext = getStoreContext(this.constructor as any)
  }

  protected destroy(): void {
    super.destroy()
    this._setValue = undefined as any
    this._dataContext = undefined as any
    this._storeContext = undefined as any
  }

  protected apply(updated: boolean): void {
    if (updated) {
      this.emit(StoreEvent.UPDATE_BEFORE, this.data)
    }
    this._setValue(!this._value)
  }

  /**
   * 在 React 组件内获取 Store 数据（与 useState 功能相似）
   */
  public useStoreState(): D {
    const [value, setValue] = useState<boolean>(false)
    this._value = value
    this._setValue = setValue
    useEffect(() => {
      if (this._used) {
        throw new Error('Store instance can only be used for one place.')
      } else {
        this._used = true
      }
      return () => this.destroy()
    }, [])
    useEffect(() => {
      this.emit(this._count === 0 ? StoreEvent.CREATE_AFTER : StoreEvent.UPDATE_AFTER, this.data)
      this.emit(StoreEvent.RENDER_AFTER, this.data)
    }, [this._count])
    return this.data
  }

  /**
   * 在 React 组件内供应 Store 数据（与 Context.Provider 功能相似）
   */
  public Provider({ children }: PropsWithChildren<{}>) {
    const data = this.useStoreState()
    return createElement(
      this._storeContext.Provider,
      { value: this },
      createElement(this._dataContext.Provider, { value: data }, children)
    )
  }
}

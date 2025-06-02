import { createContext, useImperativeHandle, useRef, forwardRef, createElement } from 'react'
import { Data } from 'core/store'
import { ReactStore } from './react-store'
import { Class } from 'utils/declaration'
import type { Context, PropsWithChildren } from 'react'

const DATA_CONTEXT_CACHE = new Map<Class<ReactStore<any>>, Context<any>>()

const STORE_CONTEXT_CACHE = new Map<Class<ReactStore<any>>, Context<any>>()

export const NOOP = () => {}

/**
 * 获取关联 Store 数据的 React 上下文
 */
export function getDataContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<Data<S>> {
  let context = DATA_CONTEXT_CACHE.get(storeClass)
  if (!context) {
    context = createContext(null)
    DATA_CONTEXT_CACHE.set(storeClass, context)
  }
  return context
}

/**
 * 获取关联 Store 实例的 React 上下文
 */
export function getStoreContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<S> {
  let context = STORE_CONTEXT_CACHE.get(storeClass)
  if (!context) {
    context = createContext(null)
    STORE_CONTEXT_CACHE.set(storeClass, context)
  }
  return context
}

/**
 * 创建 Store 实例和数据的 React 供应器
 *
 * @param createStore 用于创建 Store 实例的方法
 * @param useBridge 用于同步组件参数到 Store 实例的方法
 *
 * @param useBridge.props 组件外部参数
 * @param useBridge.store Store 实例
 * @param useBridge.created 组件节点是否已创建
 */
export function createProvider<S extends ReactStore<any>, P extends object = {}>(
  createStore: (props: P) => S,
  useBridge?: (props: P, store: S, created: boolean) => void
) {
  return forwardRef<S, PropsWithChildren<P>>(({ children, ...props }, ref) => {
    const storeRef = useRef<S>()
    let created: boolean = true
    if (storeRef.current === undefined) {
      created = true
      storeRef.current = createStore(props as any)
    }
    if (useBridge) {
      useBridge(props as any, storeRef.current, created)
    }
    useImperativeHandle(ref, () => storeRef.current as any)
    return createElement(storeRef.current.Provider, null, children)
  })
}

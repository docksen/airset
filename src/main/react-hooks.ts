import { useContext, useRef } from 'react'
import { Data } from 'core/store'
import { getDataContext, getStoreContext } from './react-contexts'
import { ReactStore } from './react-store'
import { Class } from 'utils/declaration'

/**
 * 获取 React 组件层级中，距离当前层级最近的上级 Store 数据供应器中的 Store 数据
 *
 * @param StoreClass Store 类
 */
export function useData<S extends ReactStore<any>>(StoreClass: Class<S>): Data<S> {
  return useContext(getDataContext(StoreClass))
}

/**
 * 获取 React 组件层级中，距离当前层级最近的上级 Store 实例供应器中的 Store 实例
 *
 * @param StoreClass Store 类
 */
export function useStore<S extends ReactStore<any>>(StoreClass: Class<S>): S {
  return useContext(getStoreContext(StoreClass))
}

/**
 * 创建一个 Store 实例，并在当前组件中使用
 *
 * @param createStore 用于创建 Store 实例的方法
 * @param props 用于创建 Store 实例的方法的参数
 */
export function useStoreState<S extends ReactStore<any>>(createStore: () => S): [Data<S>, S]
export function useStoreState<S extends ReactStore<any>, P extends object = {}>(
  createStore: (props: P) => S,
  props: P
): [Data<S>, S]
export function useStoreState<S extends ReactStore<any>, P extends object = {}>(
  createStore: (props?: P) => S,
  props?: P
): any {
  const storeRef = useRef<S>()
  if (!storeRef.current) {
    storeRef.current = createStore(props)
  }
  return [storeRef.current.useStoreState(), storeRef.current]
}

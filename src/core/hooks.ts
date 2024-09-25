import { useContext, useRef } from 'react'
import { Store } from './store'
import { Class, Data } from './declarations'
import { computeIfAbsentDataContext, computeIfAbsentStoreContext } from './contexts'

export function useStore<S extends Store<any>>(StoreClass: Class<S>): S {
  return useContext(computeIfAbsentStoreContext(StoreClass))
}

export function useData<S extends Store<any>>(StoreClass: Class<S>): Data<S> {
  return useContext(computeIfAbsentDataContext(StoreClass))
}

export function useLocalStore<S extends Store<any>>(createStore: () => S): [Data<S>, S]
export function useLocalStore<S extends Store<any>, P extends object = {}>(
  createStore: (props: P) => S,
  props: P
): [Data<S>, S]
export function useLocalStore<S extends Store<any>, P extends object = {}>(
  createStore: (props?: P) => S,
  props?: P
): any {
  const storeRef = useRef<S>()
  if (!storeRef.current) {
    storeRef.current = createStore(props)
  }
  return storeRef.current.useStoreState()
}

// /** 创建成功 */
// CREATED = 'created',
// /** 更新之前 */
// UPDATE_BEFORE = 'updateBefore',
// /** 更新成功 */
// UPDATED = 'updated',
// /** 渲染成功（每次渲染后都会执行，即创建+更新） */
// RENDERED = 'rendered',
// /** 销毁之前 */
// DESTROY_BEFORE = 'destroyBefore'

export function useRendered() {}

export function useMounted() {}

export function useUpdated() {}

export function useBeforeDestroy() {}

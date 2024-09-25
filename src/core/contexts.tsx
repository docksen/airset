import React, {
  Context,
  createContext,
  useImperativeHandle,
  useRef,
  forwardRef,
  PropsWithChildren
} from 'react'
import { Store } from './store'
import { Class, Data } from './declarations'

const STORE_CONTEXT_CACHE = new Map<Class<Store<any>>, Context<any>>()

const DATA_CONTEXT_CACHE = new Map<Class<Store<any>>, Context<any>>()

export function computeIfAbsentStoreContext<S extends Store<any>>(
  StoreClass: Class<S>
): Context<S> {
  let context = STORE_CONTEXT_CACHE.get(StoreClass)
  if (!context) {
    context = createContext(null)
    STORE_CONTEXT_CACHE.set(StoreClass, context)
  }
  return context
}

export const computeIfAbsentDataContext = <S extends Store<any>>(
  StoreClass: Class<S>
): Context<Data<S>> => {
  let context = DATA_CONTEXT_CACHE.get(StoreClass)
  if (!context) {
    context = createContext(null)
    DATA_CONTEXT_CACHE.set(StoreClass, context)
  }
  return context
}

export function createProvider<S extends Store<any>, P extends object = {}>(
  createStore: (props: P) => S,
  useBridge?: (props: P, store: S, mounted: boolean) => void
) {
  return forwardRef<S, PropsWithChildren<P>>(({ children, ...props }, ref) => {
    const storeRef = useRef<S>()
    if (!storeRef.current) {
      storeRef.current = createStore(props as any)
    }
    if (useBridge) {
      useBridge(props as any, storeRef.current, storeRef.current !== undefined)
    }
    useImperativeHandle(ref, () => storeRef.current as any)
    const Provider = storeRef.current.Provider
    return <Provider>{children}</Provider>
  })
}

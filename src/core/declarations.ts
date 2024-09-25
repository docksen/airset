import { Store } from './store'

export type Data<S extends Store<any>> = S extends Store<infer D> ? D : any

export type Class<C> = new (...args: any[]) => C

export type EventListener = (...args: any[]) => void

export interface StoreOptions {
  /** 是否开启debug（若开启，则在抛事件的时候，会打印数据） */
  debug?: boolean
  /** 指定默认的对比算法 */
  // compare?: Compare
  onCreated?: EventListener
  onRendered?: EventListener
  onUpdateBefore?: EventListener
  onUpdated?: EventListener
  onDestroyBefore?: EventListener
}

export interface SetDataOptions {
  /** 指定对比算法 */
  // compare?: Compare
}

export interface TaskContext<S extends Store<any>> extends Record<string, any> {
  /** 状态管理器 */
  store: S
  /** 当前数据 */
  data: Data<S>
  /** 原始数据 */
  prevData: Data<S>
  /** 在任务执行期间，更新数据 */
  update: () => boolean
  /** 在任务执行期间，是否更新了数据 */
  updated?: boolean
}

export type Task<S extends Store<any>> = (ctx: TaskContext<S>) => Promise<any> | any

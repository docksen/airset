# airset

[English Document](https://github.com/docksen/airset/blob/main/README.md)

Airset /'eəset/ 的意思是 **_A set as light as air_**（像空气一样轻量的套件）。

Airset 是一个轻量级 React 状态管理器，它有如下特性：

1. 支持服务端渲染。
2. 支持跨组件通信。
3. 高性能更新（一秒内可修改上万次数据）。
4. 最小粒度更新（仅更新数据发生变动的部分）。
5. 以类的形式，组织数据和方法。
6. 支持事件。
7. 支持快捷调试。
8. 仅依赖于 React。
9. 产物 GZip 压缩后大小为 4.5KB。

## 目录

- [airset](#airset)
  - [目录](#目录)
  - [如何使用它？](#如何使用它)
    - [方式一：跨组件通信](#方式一跨组件通信)
    - [方式二：组件内部使用](#方式二组件内部使用)
  - [如何调试它？](#如何调试它)
  - [高性能更新](#高性能更新)
  - [导出项](#导出项)
    - [Emmiter](#emmiter)
    - [Schedule](#schedule)
    - [Store](#store)
    - [React store](#react-store)
    - [React context](#react-context)
    - [React hooks](#react-hooks)
    - [Comparators](#comparators)
    - [replicators](#replicators)
    - [updaters](#updaters)

## 如何使用它？

Airset 有两种使用方式。

### 方式一：跨组件通信

Airset 跨组件通信，与 React context 的使用方式差不多，不同之处在于：

1. Airset 使用 createProvider 函数创建 Provider。
2. Airset 通过 useData 和 useStore 获取数据和操作数据的方法。

```tsx
interface Data {...}

function createStore(props: Props) {
  return new ReactStore<Data>({...})
}

const Provider = createProvider(createStore)

function Parent(props: Props) {
  return (
    <Provider {...props}>
      <Child />
    </Provider>
  )
}

function Child() {
  const data = useData(SomeStore)
  const store = useStore(SomeStore)
  // ...
}
```

### 方式二：组件内部使用

Airset 提供了 useStoreState 函数供组件内部使用，与 useState 函数用法一样。

```tsx
interface Data {...}

function createStore(props: Props) {
  return new ReactStore<Data>({...})
}

function Main(props: Props) {
  const [data, store] = useStoreState(createStore, props)
  // ...
}
```

## 如何调试它？

Airset 提供了调试功能，开启后，当 Store 有事件发生时，会在控制台打印数据。

```tsx
function createStore(props: Props) {
  return new ReactStore<Data>({...}, {  debug: true })
}
```

## 高性能更新

Airset 提供了一套高性能更新方案，以应对复杂场景下的性能问题，适用于计算量重，或者逻辑庞杂的场景。它的原理如下：

1. Airset 将当前数据复制一份，然后传递给一个个独立的小任务，任务按顺序执行，它们负责修改这份数据。
2. Airset 每次只执行 10ms，执行之后就更新一次，待到下次事件循环轮到它了，再继续执行，直到所有任务被执行完毕。

```tsx
interface Data {...}

function createStore(props: Props) {
  return new ReactStore<Data>({...})
}

function Main(props: Props) {
  const [data, store] = useStoreState(createStore, props)
  const handleClick = () => store.execute(
    ctx => ctx.data.value = ctx.data.value + 1,
    ctx => ctx.data.value = ctx.data.value + 2,
    ...
  )
  return <div onClick={handleClick}>execute</div>
}
```

## 导出项

### Emmiter

```ts
/**
 * 事件监听器
 */
type Listener = (...args: any[]) => any

interface EmitterOptions {
  /** 是否开启调试模式（若开启，则会在抛事件的时候，将数据打印出来） */
  debug?: boolean
}

class Emitter {
  /**
   * 是否开启调试模式（若开启，则会在抛事件的时候，将数据打印出来）
   */
  debug?: boolean

  constructor(options: EmitterOptions = {})

  /**
   * 注册事件监听器
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   * @param {Number} count 监听事件的次数
   */
  on(event: string, listener: Listener, count: number = 0): void

  /**
   * 注册事件监听器（只监听一次）
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   */
  once(event: string, listener: Listener): void

  /**
   * 移除事件监听器
   *
   * @param {String} event 事件类型
   * @param {Listener} listener 事件监听器
   */
  off(event?: string, listener?: Listener): void

  /**
   * 发布事件
   *
   * @param {String} event 事件类型
   * @param {...any} args 监听的回调参数
   */
  emit(event: string, ...args: any): void
}
```

### Schedule

```ts
enum ScheduleEvent {
  /** 开始任务帧之前 */
  START_BEFORE = 'startBefore',
  /** 结束任务帧之后 */
  END_AFTER = 'endAfter',
  /** 销毁之前 */
  DESTROY_BEFORE = 'destroyBefore'
}

interface ScheduleOptions extends EmitterOptions {
  /** 开始任务帧之前执行此方法 */
  onStartBefore?: Listener
  /** 结束任务帧之后执行此方法 */
  onEndAfter?: Listener
  /** 销毁之前执行此方法 */
  onDestroyBefore?: Listener
}

type ScheduleTask<TResult> = () => Promise<TResult> | TResult

class Schedule extends Emitter {
  constructor(options: ScheduleOptions = {})

  /**
   * 销毁资源
   */
  public destroy(): void

  /**
   * 添加任务
   */
  public pushTask<TResult>(task: ScheduleTask<TResult>): Promise<TResult>

  /**
   * 添加多个任务
   */
  public pushTaskList(tasks: ScheduleTask<any>[]): Promise<any[]>

  /**
   * 执行任务队列中的任务
   *
   * - 每隔 10ms，就会暂停一下，等下一次事件循环唤醒后继续
   * - 它会一直执行，直到任务队列中的任务全部清空
   */
  public async execute(): Promise<void>
}
```

### Store

```ts
enum StoreEvent {
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

interface StoreOptions extends EmitterOptions {
  /** 历史记录长度，最短 3 条，默认 10 条 */
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

interface StoreTaskContext<S extends Store<any>> extends Record<string, any> {
  /** 要修改的数据 */
  data: Data<S>
  /** 状态管理器 */
  store: S
  /** 在任务执行期间，更新数据 */
  update: () => boolean
  /** 在任务执行期间，是否更新了数据 */
  updated?: boolean
}

type StoreTask<S extends Store<any>> = (ctx: StoreTaskContext<S>) => Promise<any> | any

abstract class Store<D extends object> extends Emitter {
  /**
   * 原始数据（用于重置数据）
   */
  originalData: D

  /**
   * 对比方法的供应器
   */
  comparatorSupplier: ComparatorSupplier | undefined

  constructor(data: D, options: StoreOptions = {})

  /**
   * 当前数据
   */
  get data(): D

  /**
   * 上一条数据
   */
  get prevData(): D

  /**
   * 下一条数据
   */
  get nextData(): D

  /**
   * 更新的次数
   */
  get updatedCount(): number

  /**
   * 当前数据在历史记录中的下标
   */
  get historyIndex(): number

  /**
   * 历史记录的长度
   */
  get historyLength(): number

  /**
   * 跳转到历史记录中指定位置的数据
   *
   * - 在超长的情况下，Store 会舍弃 history 部分头部数据，所以 go(0) 获得的不一定是初始数据
   * - 若要获取初始数据，请使用 originData
   * - 若超过历史记录的长度，则跳转行为不会生效
   */
  go(index: number): boolean

  /**
   * 跳转到上一条数据
   *
   * - 若没有上一条数据，则跳转行为不会生效
   */
  back(): boolean

  /**
   * 跳转到下一条数据
   *
   * - 若没有下一条数据，则跳转行为不会生效
   */
  forward(): boolean

  /**
   * 重置数据
   *
   * - 若指定了参数 data，则用此参数进行重置
   * - 若没有指定参数 data，则使用 originData 进行重置
   * - 重置之后，originData 会被设置为此次所用的参数
   *
   * @param data 用于重置的数据
   */
  reset(data?: D): boolean

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
  refresh(force?: boolean): boolean

  /**
   * 执行任务列表
   *
   * - 可以直接在任务中，修改 ctx.data
   * - 任务结束后，ctx.data 会被用于更新
   *
   * @param tasks 多个任务
   * @returns 任务上下文
   */
  async execute(
    ...tasks: (StoreTask<this> | undefined)[]
  ): Promise<StoreTaskContext<this> | undefined>

  /**
   * 设置缓存数据（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据并刷新页面，请使用 update 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param data 缓存数据
   * @returns this
   */
  set(data?: D): this

  /**
   * 更新当前数据，并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param data 缓存数据
   * @returns this
   */
  update(data?: D): boolean

  /**
   * 设置缓存数据中的部分浅层字段（不会更新当前数据和刷新页面）
   *
   * - 若要更新当前数据中的部分浅层字段并刷新页面，请使用 updatePart 方法
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param partData 缓存数据中的部分浅层字段
   * @returns this
   */
  setPart(partData: Partial<D>): this

  /**
   * 更新当前数据中的部分浅层字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param partData 缓存数据中的部分浅层字段
   * @returns this
   */
  updatePart(partData: Partial<D>): boolean

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
  setItem(key: keyof D, value: D[keyof D]): this

  /**
   * 更新当前数据中的某个浅层字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param key 浅层字段名
   * @param value 浅层字段值
   * @returns this
   */
  updateItem(key: keyof D, value: D[keyof D]): boolean

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
  setPath(path: string, value: any): this

  /**
   * 更新当前数据中的某个路径下的字段并刷新页面
   *
   * - 若要刷新页面，请使用 refresh 方法
   *
   * @param path 字段路径
   * @param value 字段值
   * @returns this
   */
  updatePath(path: string, value: any): boolean
}
```

### React store

```ts
class ReactStore<D extends object> extends Store<D> {
  constructor(data: D, options?: StoreOptions)

  /**
   * 在 React 组件内获取 Store 数据（与 useState 功能相似）
   */
  public useStoreState(): D

  /**
   * 在 React 组件内供应 Store 数据（与 Context.Provider 功能相似）
   */
  public Provider({ children }: PropsWithChildren<{}>)
}
```

### React context

```ts
/**
 * 获取关联 Store 数据的 React 上下文
 */
function getDataContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<Data<S>>

/**
 * 获取关联 Store 实例的 React 上下文
 */
function getStoreContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<S>

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
function createProvider<S extends ReactStore<any>, P extends object = {}>(
  createStore: (props: P) => S,
  useBridge?: (props: P, store: S, mounted: boolean) => void
): React.ForwardRefExoticComponent<React.PropsWithoutRef<PropsWithChildren<P>>
```

### React hooks

```ts
/**
 * 获取 React 组件层级中，距离当前层级最近的上级 Store 数据供应器中的 Store 数据
 *
 * @param StoreClass Store 类
 */
function useData<S extends ReactStore<any>>(StoreClass: Class<S>): Data<S>

/**
 * 获取 React 组件层级中，距离当前层级最近的上级 Store 实例供应器中的 Store 实例
 *
 * @param StoreClass Store 类
 */
function useStore<S extends ReactStore<any>>(StoreClass: Class<S>): S

/**
 * 创建一个 Store 实例，并在当前组件中使用
 *
 * @param createStore 用于创建 Store 实例的方法
 * @param props 用于创建 Store 实例的方法的参数
 */
function useStoreState<S extends ReactStore<any>>(createStore: () => S): [Data<S>, S]
function useStoreState<S extends ReactStore<any>, P extends object = {}>(
  createStore: (props: P) => S,
  props: P
): [Data<S>, S]
```

### Comparators

```tsx
/**
 * 比对方法
 */
type Comparator = (a: any, b: any) => boolean

/**
 * 比对方法的供应器
 *
 * @param jsonPath 对比的节点，在数据中的路径
 */
type ComparatorSupplier = (jsonPath: string, a: any, b: any) => Comparator | undefined

/**
 * 判断两参数是否全相等
 *
 * - 两个参数值相等时，为true
 */
function fullEqual(a: any, b: any): boolean

/**
 * 判断两参数是否浅层相等
 *
 * - 两个参数全等，或者其所有节点全等时，为true
 * - 只比较可枚举的节点
 * - 如果节点是对象，它们的构造器函数不同，则认为不相等
 *
 * @param comparatorSupplier 自定义节点对比规则
 */
function shallowEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean

/**
 * 判断两参数是否深度相等
 *
 * - 两个参数全等，或者其所有节点深等时，为true
 * - 只比较可枚举的节点
 * - 如果节点是对象，它们的构造器函数不同，则认为不相等
 *
 * @param comparatorSupplier 自定义节点对比规则
 */
function deepEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean
```

### replicators

```tsx
/**
 * 将参数浅层复制一份
 */
function shallowClone<T>(it: T): T

/**
 * 将参数深度复制一份
 */
function deepClone<T>(it: T): T
```

### updaters

```tsx
/**
 * 将新数据中未被修改的节点，用旧节点替换
 *
 * - 当新旧节点数据不深等时，使用新节点数据，否则沿用旧节点数据。
 * - 本方法会修改 newData 的部分节点
 *
 * @param oldData 旧数据
 * @param newData 新数据
 * @returns [是否相等, 最终数据]
 */
function deepUpdate(
  oldData: any,
  newData: any,
  comparatorSupplier?: ComparatorSupplier
): [boolean, any]
```

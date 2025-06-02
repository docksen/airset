# airset

[中文文档](https://github.com/docksen/airset/blob/main/README_zh.md)

Airset /'eəset/ means **_A set as light as air_**.

Airset is a lightweight React state manager with the following features:

1. Support server-side rendering.
2. Support cross component communication.
3. High performance updates (can modify data tens of thousands of times within one second).
4. Minimum granularity update (only updating the parts of the data that have changed).
5. Organize data and methods in the form of classes.
6. Support events.
7. Support quick debugging.
8. Relying solely on React.
9. The compressed size of the product GZip is 4.5KB.

## Contents

- [airset](#airset)
  - [Contents](#contents)
  - [How to use it?](#how-to-use-it)
    - [Method 1: Cross component communication](#method-1-cross-component-communication)
    - [Method 2: Internal use of component](#method-2-internal-use-of-component)
  - [How to debug it?](#how-to-debug-it)
  - [High performance updates](#high-performance-updates)
  - [Export items](#export-items)
    - [Emmiter](#emmiter)
    - [Schedule](#schedule)
    - [Store](#store)
    - [React store](#react-store)
    - [React context](#react-context)
    - [React hooks](#react-hooks)
    - [Comparators](#comparators)
    - [replicators](#replicators)
    - [updaters](#updaters)

## How to use it?

Airset has two ways of use.

### Method 1: Cross component communication

Airset cross component communication is similar to the usage of React context, with the difference being:

1. Airset uses the `creatProvider` function to create a Provider.
2. Airset uses useData and useStore to obtain and manipulate data.

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

### Method 2: Internal use of component

Airset provides the useStoreState function for internal use within components, which is used in the same way as the useState function.

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

## How to debug it?

Airset provides debugging functionality, which when enabled, will print data on the console when an event occurs in the Store.

```tsx
function createStore(props: Props) {
  return new ReactStore<Data>({...}, {  debug: true })
}
```

## High performance updates

Airset provides a high-performance update solution to address performance issues in complex scenarios, suitable for computationally intensive or logically complex scenarios. Its principle is as follows:

1. Airset copies the current data and passes it on to independent small tasks, which are executed in order and responsible for modifying the data.
2. Airset only executes for 10ms each time, and updates once after execution. It continues to execute until the next event loop is its turn, until all tasks are completed.

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

## Export items

### Emmiter

```ts
/**
 * Event listener
 */
type Listener = (...args: any[]) => any

interface EmitterOptions {
  /** Whether to enable debug mode (if enabled, data will be printed when the event is thrown) */
  debug?: boolean
}

class Emitter {
  /**
   * Whether to enable debug mode (if enabled, data will be printed when the event is thrown)
   */
  debug?: boolean

  constructor(options: EmitterOptions = {})

  /**
   * Register event listener
   *
   * @param {String} event event type
   * @param {Listener} listener event listener
   * @param {Number} count number of events to listen
   */
  on(event: string, listener: Listener, count: number = 0): void

  /**
   * Register event listener (only listen once)
   *
   * @param {String} event event type
   * @param {Listener} listener event listener
   */
  once(event: string, listener: Listener): void

  /**
   * Remove event listener
   *
   * @param {String} event event type
   * @param {Listener} listener event listener
   */
  off(event?: string, listener?: Listener): void

  /**
   * Publish event
   *
   * @param {String} event event type
   * @param {...any} args callback parameter for listener
   */
  emit(event: string, ...args: any): void
}
```

### Schedule

```ts
enum ScheduleEvent {
  /** Before starting the task frame */
  START_BEFORE = 'startBefore',
  /** After ending the task frame */
  END_AFTER = 'endAfter',
  /** Before destruction */
  DESTROY_BEFORE = 'destroyBefore'
}

interface ScheduleOptions extends EmitterOptions {
  /** Execute this method before starting the task frame */
  onStartBefore?: Listener
  /** Execute this method after ending the task frame */
  onEndAfter?: Listener
  /** Execute this method before destruction */
  onDestroyBefore?: Listener
}

type ScheduleTask<TResult> = () => Promise<TResult> | TResult

class Schedule extends Emitter {
  constructor(options: ScheduleOptions = {})

  /**
   * Destroy resources
   */
  public destroy(): void

  /**
   * Add tasks
   */
  public pushTask<TResult>(task: ScheduleTask<TResult>): Promise<TResult>

  /**
   * Add multiple tasks
   */
  public pushTaskList(tasks: ScheduleTask<any>[]): Promise<any[]>

  /**
   * Execute tasks in the task queue
   *
   * - Pause every 10ms and continue after the next event loop wakes up
   * - It will continue to execute until all tasks in the task queue are cleared
   */
  public async execute(): Promise<void>
}
```

### Store

```ts
enum StoreEvent {
  /** After creation */
  CREATE_AFTER = 'createAfter',
  /** Before update */
  UPDATE_BEFORE = 'updateBefore',
  /** After update */
  UPDATE_AFTER = 'updateAfter',
  /** After rendering (after creation & update) */
  RENDER_AFTER = 'renderAfter',
  /** Before destruction */
  DESTROY_BEFORE = 'destroyBefore'
}

interface StoreOptions extends EmitterOptions {
  /** History length, minimum 3, default 10 */
  maxLength?: number
  /** Comparison method supplier */
  comparatorSupplier?: ComparatorSupplier
  /** Listen for events after creation */
  onCreateAfter?: Listener
  /** Listen for events before update */
  onUpdateBefore?: Listener
  /** Listen for events after update */
  onUpdateAfter?: Listener
  /** Listen for events after rendering (creating & updating) */
  onRenderAfter?: Listener
  /** Listen for events before destruction */
  onDestroyBefore?: Listener
}

interface StoreTaskContext<S extends Store<any>> extends Record<string, any> {
  /** Data to be modified */
  data: Data<S>
  /** State manager */
  store: S
  /** Update data during task execution */
  update: () => boolean
  /** Whether data is updated during task execution */
  updated?: boolean
}

type StoreTask<S extends Store<any>> = (ctx: StoreTaskContext<S>) => Promise<any> | any

abstract class Store<D extends object> extends Emitter {
  /**
   * Original data (for resetting data)
   */
  originalData: D

  /**
   * Provider for comparison method
   */
  comparatorSupplier: ComparatorSupplier | undefined

  constructor(data: D, options: StoreOptions = {})

  /**
   * Current data
   */
  get data(): D

  /**
   * Previous data
   */
  get prevData(): D

  /**
   * Next data
   */
  get nextData(): D

  /**
   * Number of updates
   */
  get updatedCount(): number

  /**
   * Index of current data in history record
   */
  get historyIndex(): number

  /**
   * Length of history record
   */
  get historyLength(): number

  /**
   * Jump to data at specified position in history record
   *
   * - In case of excessive length, Store will discard part of history header data, so go(0) may not get initial data
   * - To get initial data, use originData
   * - If the length of history record is exceeded, jump behavior will not take effect
   */
  go(index: number): boolean

  /**
   * Jump to the previous data
   *
   * - If there is no previous data, the jump behavior will not take effect
   */
  back(): boolean

  /**
   * Jump to the next data
   *
   * - If there is no next data, the jump behavior will not take effect
   */
  forward(): boolean

  /**
   * Reset data
   *
   * - If the parameter data is specified, use this parameter to reset
   * - If the parameter data is not specified, use originData to reset
   * - After resetting, originData will be set to the parameter used this time
   *
   * @param data The data used for reset
   */
  reset(data?: D): boolean

  /**
   * Refresh the page (update the page with cached data)
   *
   * - If force is specified as true, refresh the page directly without modifying the current data
   * - If there is no cached data, do not update
   * - If there is no difference between the cached data and the current data, do not update
   * - If there is a difference between the cached data and the current data, keep the original reference for the part without difference and update the part with difference
   * - You can get the comparison method through comparatorSupplier, and the comparison method determines whether the two data are different
   *
   * @param force Do not update the data, refresh the page directly
   * @returns Whether the page is refreshed
   */
  refresh(force?: boolean): boolean

  /**
   * Execute task list
   *
   * - You can modify ctx.data directly in the task
   * - After the task is completed, ctx.data will be used for update
   *
   * @param tasks Multiple tasks
   * @returns Task context
   */
  async execute(
    ...tasks: (StoreTask<this> | undefined)[]
  ): Promise<StoreTaskContext<this> | undefined>

  /**
   * Set data
   *
   * - Only set cached data, will not update current data and refresh the page
   * - To update current data and refresh the page, please use the update method
   * - To refresh the page, use the refresh method
   *
   * @param data cache data
   * @returns this
   */
  set(data?: D): this

  /**
   * Update data
   *
   * - Update the current data and refresh the page
   * - To refresh the page, use the refresh method
   *
   * @param data cache data
   * @returns this
   */
  update(data?: D): boolean

  /**
   * Set some shallow fields in the data
   *
   * - Only set some fields in the cached data, will not update the current data and refresh the page
   * - To update some shallow fields in the current data and refresh the page, use the updatePart method
   * - To refresh the page, use the refresh method
   *
   * @param partData Some shallow fields in the cached data
   * @returns this
   */
  setPart(partData: Partial<D>): this

  /**
   * Update some shallow fields in the data
   *
   * - Update some shallow fields in the current data and refresh the page
   * - To refresh the page, use the refresh method
   *
   * @param partData Some shallow fields in the cached data
   * @returns this
   */
  updatePart(partData: Partial<D>): boolean

  /**
   * Set a shallow field in the data
   *
   * - Only set a field in the cached data, will not update the current data and refresh the page
   * - To update a shallow field in the current data and refresh the page, use the updateItem method
   * - To refresh the page, use the refresh method
   *
   * @param key Shallow field name
   * @param value Shallow field value
   * @returns this
   */
  setItem(key: keyof D, value: D[keyof D]): this

  /**
   * Update a shallow field in the data
   *
   * - Update a shallow field in the current data and refresh the page
   * - To refresh the page, use the refresh method
   *
   * @param key Shallow field name
   * @param value Shallow field value
   * @returns this
   */
  updateItem(key: keyof D, value: D[keyof D]): boolean

  /**
   * Set a field under a path in the data
   *
   * - Only set a field under a path in the cached data, and will not update the current data or refresh the page
   * - To update a field under a path in the current data and refresh the page, use the updateItem method
   * - To refresh the page, use the refresh method
   *
   * @param path field path
   * @param value field value
   * @returns this
   */
  setPath(path: string, value: any): this

  /**
   * Update a field under a path in the data
   *
   * - Update a field under a path in the current data and refresh the page
   * - To refresh the page, use the refresh method
   *
   * @param path field path
   * @param value field value
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
   * Get Store data in React components (similar to useState)
   */
  public useStoreState(): D

  /**
   * Supply Store data in React components (similar to Context.Provider)
   */
  public Provider({ children }: PropsWithChildren<{}>)
}
```

### React context

```ts
/**
* Get the React context associated with the Store data
*/
function getDataContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<Data<S>>

/**
* Get the React context associated with the Store instance
*/
function getStoreContext<S extends ReactStore<any>>(storeClass: Class<S>): Context<S>

/**
* Create a React provider for Store instances and data
*
* @param createStore Method for creating Store instances
* @param useBridge Method for synchronizing component parameters to Store instances
*
* @param useBridge.props Component external parameters
* @param useBridge.store Store instance
* @param useBridge.created Whether the component node has been created
*/
function createProvider<S extends ReactStore<any>, P extends object = {}>(
createStore: (props: P) => S,
useBridge?: (props: P, store: S, mounted: boolean) => void
): React.ForwardRefExoticComponent<React.PropsWithoutRef<PropsWithChildren<P>>
```

### React hooks

```ts
/**
 * Get the Store data in the parent Store data provider closest to the current level in the React component hierarchy
 *
 * @param StoreClass Store class
 */
function useData<S extends ReactStore<any>>(StoreClass: Class<S>): Data<S>

/**
 * Get the Store instance in the parent Store instance provider closest to the current level in the React component hierarchy
 *
 * @param StoreClass Store class
 */
function useStore<S extends ReactStore<any>>(StoreClass: Class<S>): S

/**
 * Create a Store instance and use it in the current component
 *
 * @param createStore Method for creating a Store instance
 * @param props Parameters of the method used to create the Store instance
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
 * Comparison method
 */
type Comparator = (a: any, b: any) => boolean

/**
 * Comparison method supplier
 *
 * @param jsonPath The node to be compared, the path in the data
 */
type ComparatorSupplier = (jsonPath: string, a: any, b: any) => Comparator | undefined

/**
 * Determine whether two parameters are completely equal
 *
 * - True if the two parameter values ​​are equal
 */
function fullEqual(a: any, b: any): boolean

/**
 * Determine whether two parameters are shallowly equal
 *
 * - True if the two parameters are equal or all their nodes are equal
 * - Only compare enumerable nodes
 * - If the nodes are objects and their constructor functions are different, they are considered unequal
 *
 * @param comparatorSupplier Custom node comparison rules
 */
function shallowEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean

/**
 * Determine if two parameters are deeply equal
 *
 * - True if two parameters are equal or all their nodes are deeply equal
 * - Only compare enumerable nodes
 * - If the nodes are objects and their constructor functions are different, they are considered unequal
 *
 * @param comparatorSupplier custom node comparison rules
 */
function deepEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean
```

### replicators

```tsx
/**
 * Shallowly copy the parameter
 */
function shallowClone<T>(it: T): T

/**
 * Deeply copy the parameter
 */
function deepClone<T>(it: T): T
```

### updaters

```tsx
/**
 * Replace the unmodified nodes in the new data with the old nodes
 *
 * - When the new and old node data are not deep equal, use the new node data, otherwise use the old node data.
 * - This method will modify some nodes of newData
 *
 * @param oldData old data
 * @param newData new data
 * @returns [whether equal, final data]
 */
function deepUpdate(
  oldData: any,
  newData: any,
  comparatorSupplier?: ComparatorSupplier
): [boolean, any]
```

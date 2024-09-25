import { getJsonPath } from './object'

export type Replicator = (
  value: any,
  keyOrIndex: string | number,
  parent: any,
  jsonPath: string
) => any

export type ReplicatorMatcher = (jsonPath: string) => Replicator | undefined

/**
 * 将参数浅层复制一份
 *
 * @param matchReplicator 自定义节点复制规则
 */
export function shallowClone<T>(it: T, matchReplicator?: ReplicatorMatcher): T {
  if (typeof it !== 'object' || it === null) {
    return it
  }
  if (Array.isArray(it)) {
    const newArray: any[] = []
    it.forEach((_item, index) => {
      newArray[index] = _shallowCloneNode(it, newArray, index, matchReplicator)
    })
    return newArray as any
  }
  const descriptors = Object.getOwnPropertyDescriptors(it)
  const keys = Object.keys(descriptors)
  const newObject = Object.create(Object.getPrototypeOf(it))
  for (let i = 0, key = keys[i]; i < keys.length; i = i + 1, key = keys[i]) {
    const descriptor = descriptors[key]
    if (descriptor.get || descriptor.set) {
      Object.defineProperty(newObject, key, descriptor)
    } else {
      Object.defineProperty(newObject, key, {
        ...descriptor,
        value: _shallowCloneNode(it, newObject, key, matchReplicator)
      })
    }
  }
  return newObject
}

function _shallowCloneNode(
  parent: any,
  newData: any,
  keyOrIndex: string | number,
  matchReplicator?: ReplicatorMatcher
) {
  const oldValue = parent[keyOrIndex]
  // 处理循环引用情景
  if (oldValue === parent) {
    return newData
  }
  const jsonPath = getJsonPath(parent, keyOrIndex)
  const replicator = matchReplicator ? matchReplicator(jsonPath) : undefined
  return replicator ? replicator(oldValue, keyOrIndex, parent, jsonPath) : oldValue
}

/**
 * 将参数深度复制一份
 *
 * @param matchReplicator 自定义节点复制规则
 */
export function deepClone<T>(it: T, matchReplicator?: ReplicatorMatcher): T {
  return _deepClone(it, new Map(), undefined, matchReplicator)
}

function _deepClone<T>(
  it: T,
  cacheMap: Map<object, object>,
  parentPath?: string,
  matchReplicator?: ReplicatorMatcher
): T {
  if (typeof it !== 'object' || it === null) {
    return it
  }
  if (Array.isArray(it)) {
    const newArray: any[] = []
    cacheMap.set(it, newArray)
    it.forEach((_item, index) => {
      newArray[index] = _deepCloneNode(it, cacheMap, index, parentPath, matchReplicator)
    })
    return newArray as any
  }
  const newObject = Object.create(Object.getPrototypeOf(it))
  cacheMap.set(it, newObject)
  const descriptors = Object.getOwnPropertyDescriptors(it)
  const keys = Object.keys(descriptors)
  for (let i = 0, key = keys[i]; i < keys.length; i = i + 1, key = keys[i]) {
    const descriptor = descriptors[key]
    if (descriptor.get || descriptor.set) {
      Object.defineProperty(newObject, key, descriptor)
    } else {
      Object.defineProperty(newObject, key, {
        ...descriptor,
        value: _deepCloneNode(it, cacheMap, key, parentPath, matchReplicator)
      })
    }
  }
  return newObject
}

function _deepCloneNode(
  parent: any,
  cacheMap: Map<object, object>,
  keyOrIndex: string | number,
  parentPath?: string,
  matchReplicator?: ReplicatorMatcher
) {
  const oldValue = parent[keyOrIndex]
  // 处理循环引用情景
  const cacheData = cacheMap.get(oldValue)
  if (cacheData) {
    return cacheData
  }
  const jsonPath = getJsonPath(parent, keyOrIndex, parentPath)
  const replicator = matchReplicator ? matchReplicator(jsonPath) : undefined
  return replicator
    ? replicator(oldValue, keyOrIndex, parent, jsonPath)
    : _deepClone(oldValue, cacheMap, jsonPath, matchReplicator)
}

import { getJsonPath, hasOwnProperty } from './object'

export type Comparator = (a: any, b: any) => boolean

export type ComparatorMatcher = (jsonPath: string) => Comparator | undefined

/**
 * 判断两参数是否全相等
 *
 * - 两个参数值相等时，为true
 */
export function fullEqual(a: any, b: any): boolean {
  return a === b ? a !== 0 || b !== 0 || 1 / a === 1 / b : a !== a && b !== b
}

/**
 * 判断两参数是否浅层相等
 *
 * - 两个参数全等，或者其所有节点全等时，为true
 * - 只比较可枚举的节点
 * - 如果节点是对象，它们的构造器函数不同，则认为不相等
 *
 * @param matchComparator 自定义节点对比规则
 */
export function shallowEqual(a: any, b: any, matchComparator?: ComparatorMatcher): boolean {
  if (fullEqual(a, b)) {
    return true
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (a.constructor !== b.constructor) {
    return false
  }
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) {
    return false
  }
  for (let i = 0, key = keys[i]; i < keys.length; i = i + 1, key = keys[i]) {
    if (!hasOwnProperty(b, key)) {
      return false
    }
    const comparator = matchComparator ? matchComparator(getJsonPath(a, key)) : undefined
    const equal = comparator ? comparator(a[key], b[key]) : fullEqual(a[key], b[key])
    if (!equal) {
      return false
    }
  }
  return true
}

/**
 * 判断两参数是否深度相等
 *
 * - 两个参数全等，或者其所有节点深等时，为true
 * - 只比较可枚举的节点
 * - 如果节点是对象，它们的构造器函数不同，则认为不相等
 *
 * @param matchComparator 自定义节点对比规则
 */
export function deepEqual(a: any, b: any, matchComparator?: ComparatorMatcher): boolean {
  return _deepEqual(a, b, new Map(), undefined, matchComparator)
}

function _deepEqual(
  a: any,
  b: any,
  cacheMap: Map<any, Map<any, boolean>>,
  parentPath?: string,
  matchComparator?: ComparatorMatcher
): boolean {
  if (fullEqual(a, b)) {
    return true
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (a.constructor !== b.constructor) {
    return false
  }
  // 处理重复引用情景
  let subCacheMap = cacheMap.get(a)
  if (subCacheMap) {
    let cacheData = subCacheMap.get(b)
    if (cacheData !== undefined) {
      return cacheData
    }
  } else {
    subCacheMap = new Map()
    cacheMap.set(a, subCacheMap)
  }
  const equal = _deepEqualObject(a, b, cacheMap, parentPath, matchComparator)
  subCacheMap.set(b, equal)
  return equal
}

function _deepEqualObject(
  a: any,
  b: any,
  cacheMap: Map<any, Map<any, boolean>>,
  parentPath?: string,
  matchComparator?: ComparatorMatcher
): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) {
    return false
  }
  for (let i = 0, key = keys[i]; i < keys.length; i = i + 1, key = keys[i]) {
    if (!hasOwnProperty(b, key)) {
      return false
    }
    const jsonPath = getJsonPath(a, key, parentPath)
    const comparator = matchComparator ? matchComparator(jsonPath) : undefined
    const equal = comparator
      ? comparator(a[key], b[key])
      : _deepEqual(a[key], b[key], cacheMap, jsonPath, matchComparator)
    if (!equal) {
      return false
    }
  }
  return true
}

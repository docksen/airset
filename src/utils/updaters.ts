import { ComparatorMatcher, fullEqual } from './comparators'
import { getJsonPath, hasOwnProperty } from './object'

/**
 * 将新数据中未被修改的节点，用旧节点替换
 *
 * - 当新旧节点数据不深等时，使用新节点数据，否则沿用旧节点数据。
 * - 本方法会修改 newData 的部分节点
 *
 * @param oldData 旧数据
 * @param newData 新数据
 * @returns 最终数据
 */
export function deepUpdate(
  oldData: any,
  newData: any,
  matchComparator?: ComparatorMatcher
): [boolean, any] {
  const equal = _deepUpdate(oldData, newData, new Map(), undefined, matchComparator)
  return [equal, equal ? oldData : newData]
}

function _deepUpdate(
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
  const equal = _deepUpdateObject(a, b, cacheMap, parentPath, matchComparator)
  subCacheMap.set(b, equal)
  return true
}

function _deepUpdateObject(
  a: any,
  b: any,
  cacheMap: Map<any, Map<any, boolean>>,
  parentPath?: string,
  matchComparator?: ComparatorMatcher
): boolean {
  let equals = true
  const keys = Object.keys(a)
  for (let i = 0, key = keys[i]; i < keys.length; i = i + 1, key = keys[i]) {
    if (!hasOwnProperty(b, key)) {
      equals = false
      continue
    }
    const jsonPath = getJsonPath(a, key, parentPath)
    const comparator = matchComparator ? matchComparator(jsonPath) : undefined
    const equal = comparator
      ? comparator(a[key], b[key])
      : _deepUpdate(a[key], b[key], cacheMap, jsonPath, matchComparator)
    if (equal) {
      b[key] = a[key]
    } else {
      equals = false
    }
  }
  if (!equals || keys.length !== Object.keys(b).length) {
    return false
  }
  return true
}

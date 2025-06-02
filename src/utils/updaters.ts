import { ComparatorSupplier, fullEqual } from './comparators'
import { concatJsonPath, hasOwnProperty } from './object'

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
export function deepUpdate(
  oldData: any,
  newData: any,
  comparatorSupplier?: ComparatorSupplier
): [boolean, any] {
  const equal = deepUpdateValue(oldData, newData, new Map(), undefined, comparatorSupplier)
  return [equal, equal ? oldData : newData]
}

function deepUpdateValue(
  a: any,
  b: any,
  cacheMap: Map<any, any>,
  parentPath?: string,
  comparatorSupplier?: ComparatorSupplier
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
  cacheMap.set(a, b)
  return deepUpdateObject(a, b, cacheMap, parentPath, comparatorSupplier)
}

function deepUpdateObject(
  a: any,
  b: any,
  cacheMap: Map<any, any>,
  parentPath?: string,
  comparatorSupplier?: ComparatorSupplier
): boolean {
  let equals = true
  const keys = Object.keys(a)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!hasOwnProperty(b, key)) {
      equals = false
      continue
    }
    const av = a[key]
    const bv = b[key]
    // 处理循环引用
    if (cacheMap.has(av)) {
      if (bv !== cacheMap.get(av) && bv !== av) {
        equals = false
      }
      continue
    }
    const jsonPath = concatJsonPath(a, key, parentPath)
    const comparator = comparatorSupplier ? comparatorSupplier(jsonPath, a, b) : undefined
    const equal = comparator
      ? comparator(av, bv)
      : deepUpdateValue(av, bv, cacheMap, jsonPath, comparatorSupplier)
    if (equal) {
      b[key] = a[key]
    } else {
      equals = false
    }
  }
  return equals && keys.length === Object.keys(b).length
}

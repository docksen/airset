import { concatJsonPath, hasOwnProperty } from './object'

/**
 * 比对方法
 */
export type Comparator = (a: any, b: any) => boolean

/**
 * 比对方法的供应器
 *
 * @param jsonPath 对比的节点，在数据中的路径
 */
export type ComparatorSupplier = (jsonPath: string, a: any, b: any) => Comparator | undefined

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
 * @param comparatorSupplier 自定义节点对比规则
 */
export function shallowEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean {
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
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!hasOwnProperty(b, key)) {
      return false
    }
    const av = a[key]
    const bv = b[key]
    // 处理循环引用
    if (av === a) {
      if (bv !== b && bv !== av) {
        return false
      }
      continue
    }
    const jsonPath = concatJsonPath(a, key)
    const comparator = comparatorSupplier ? comparatorSupplier(jsonPath, a, b) : undefined
    const equal = comparator ? comparator(av, bv) : fullEqual(av, bv)
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
 * @param comparatorSupplier 自定义节点对比规则
 */
export function deepEqual(a: any, b: any, comparatorSupplier?: ComparatorSupplier): boolean {
  return deepEqualValue(a, b, new Map(), undefined, comparatorSupplier)
}

function deepEqualValue(
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
  return deepEqualObject(a, b, cacheMap, parentPath, comparatorSupplier)
}

function deepEqualObject(
  a: any,
  b: any,
  cacheMap: Map<any, any>,
  parentPath?: string,
  comparatorSupplier?: ComparatorSupplier
): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) {
    return false
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!hasOwnProperty(b, key)) {
      return false
    }
    const av = a[key]
    const bv = b[key]
    // 处理循环引用
    if (cacheMap.has(av)) {
      if (bv !== cacheMap.get(av) && bv !== av) {
        return false
      }
      continue
    }
    const jsonPath = concatJsonPath(a, key, parentPath)
    const comparator = comparatorSupplier ? comparatorSupplier(jsonPath, a, b) : undefined
    const equal = comparator
      ? comparator(av, bv)
      : deepEqualValue(av, bv, cacheMap, jsonPath, comparatorSupplier)
    if (!equal) {
      return false
    }
  }
  return true
}

/**
 * 将参数浅层复制一份
 */
export function shallowClone<T>(it: T): T {
  if (typeof it !== 'object' || it === null) {
    return it
  }
  // 复制数组
  if (Array.isArray(it)) {
    const newArray: any[] = []
    it.forEach((_item, index) => {
      newArray[index] = shallowCloneNode(it, newArray, index)
    })
    return newArray as any
  }
  // 复制对象
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
        value: shallowCloneNode(it, newObject, key)
      })
    }
  }
  return newObject
}

function shallowCloneNode(parent: any, newData: any, keyOrIndex: string | number) {
  // 处理循环引用
  const oldValue = parent[keyOrIndex]
  if (oldValue === parent) {
    return newData
  }
  return oldValue
}

/**
 * 将参数深度复制一份
 */
export function deepClone<T>(it: T): T {
  return deepCloneValue(it, new Map())
}

function deepCloneValue<T>(it: T, cacheMap: Map<any, any>): T {
  if (typeof it !== 'object' || it === null) {
    return it
  }
  // 复制数组
  if (Array.isArray(it)) {
    const newArray: any[] = []
    cacheMap.set(it, newArray)
    it.forEach((_item, index) => {
      newArray[index] = deepCloneNode(it, cacheMap, index)
    })
    return newArray as any
  }
  // 复制对象
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
        value: deepCloneNode(it, cacheMap, key)
      })
    }
  }
  return newObject
}

function deepCloneNode(parent: any, cacheMap: Map<any, any>, keyOrIndex: string | number) {
  // 处理循环引用
  const oldValue = parent[keyOrIndex]
  const cacheData = cacheMap.get(oldValue)
  if (cacheData) {
    return cacheData
  }
  return deepCloneValue(oldValue, cacheMap)
}

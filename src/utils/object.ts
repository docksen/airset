import { shallowClone } from './replicators'

const POSITIVE_OR_ZERO_EXP = /^(0|[1-9][0-9]*)$/

const JSON_PATH_DELIMITER_EXP: RegExp = /[\.\[\]]+/

export function hasOwnProperty(it: any, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(it, key)
}

export function isPositiveOrZeroString(it: string) {
  return POSITIVE_OR_ZERO_EXP.test(it)
}

export function concatJsonPath(parent: any, keyOrIndex: string | number, parentPath?: string) {
  const suffix = Array.isArray(parent) ? '[' + keyOrIndex + ']' : '.' + keyOrIndex
  return (parentPath || '$') + suffix
}

export function toJsonNodes(path: string) {
  if (path[0] === '$') {
    path = path.slice(2)
  }
  return path.split(JSON_PATH_DELIMITER_EXP).filter(Boolean)
}

export function setByJsonPath(it: any, path: string, value: any) {
  return setByJsonNodes(it, toJsonNodes(path), value)
}

export function setByJsonNodes(it: any, nodes: string[], value: any) {
  const key = nodes[0]
  if (nodes.length === 0) {
    return it
  } else if (typeof it === 'object' && it !== null) {
    const anyData = shallowClone(it)
    anyData[key] = nodes.length <= 1 ? value : setByJsonNodes(it[key], nodes.slice(1), value)
    return anyData
  } else if (it === undefined || it === null) {
    if (isPositiveOrZeroString(key)) {
      const anyData: any[] = []
      anyData.push(nodes.length <= 1 ? value : setByJsonNodes(undefined, nodes.slice(1), value))
      return anyData
    } else {
      const anyData: Record<string, any> = {}
      anyData[key] = nodes.length <= 1 ? value : setByJsonNodes(undefined, nodes.slice(1), value)
      return anyData
    }
  } else {
    throw new Error('The path does not exist.')
  }
}

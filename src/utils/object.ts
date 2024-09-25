export function hasOwnProperty(it: any, key: string) {
  return Object.prototype.hasOwnProperty.call(it, key)
}

export function getJsonPath(parent: any, keyOrIndex: string | number, parentPath?: string) {
  return (parentPath || '$') + Array.isArray(parent) ? '[' + keyOrIndex + ']' : '.' + keyOrIndex
}

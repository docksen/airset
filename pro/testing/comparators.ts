import { assertTrue } from './assert'
import { fullEqual, shallowEqual, deepEqual, deepClone } from 'airset'

const DATA1: Record<string, any> = {}
const DATA2: Record<string, any> = {
  a: 1,
  b: 'x',
  c: false,
  d: null,
  e: undefined,
  f: DATA1,
  g: [Infinity, -Infinity, NaN, DATA1]
}

DATA1.a = DATA2
DATA1.b = DATA2.f
DATA2.g.push(DATA2)
DATA2.h = DATA2
Object.defineProperty(DATA2, 'i', {
  writable: false,
  enumerable: false,
  configurable: false,
  value: { a: 1 }
})

assertTrue('fullEqual', fullEqual(NaN, NaN) === true)
assertTrue('fullEqual', fullEqual(null, null) === true)
assertTrue('fullEqual', fullEqual('0', 0) === false)
assertTrue('fullEqual', fullEqual(DATA1, {}) === false)
assertTrue('fullEqual', fullEqual(DATA1, DATA1) === true)
assertTrue('fullEqual', fullEqual(DATA1.a, DATA2) === true)

assertTrue('shadowEqual', shallowEqual('0', 0) === false)
assertTrue('shadowEqual', shallowEqual(DATA1.a, { ...DATA2 }) === true)
assertTrue('shadowEqual', shallowEqual(DATA2, { ...DATA2, h: 0 }) === false)
assertTrue('shadowEqual', shallowEqual(DATA2, { ...DATA2, a: '1' }) === false)
assertTrue('shadowEqual', shallowEqual(DATA2, { ...DATA2, f: { ...DATA1 } }) === false)
assertTrue('shadowEqual', shallowEqual(DATA2, { ...DATA2, g: [...DATA2.g] }) === false)
assertTrue(
  'shadowEqual',
  shallowEqual(DATA2, { ...DATA2, g: [...DATA2.g] }, path => {
    if (path === '$.g') {
      return () => true
    }
  }) === true
)

assertTrue('deepEqual', deepEqual(DATA2, deepClone(DATA2)) === true)
assertTrue('deepEqual', deepEqual(DATA2, { ...DATA2, g: [...DATA2.g] }) === true)
assertTrue('deepEqual', deepEqual(DATA2, { ...DATA2, f: { ...DATA1, a: 1 } }) === false)
assertTrue(
  'deepEqual',
  deepEqual(DATA2, { ...DATA2, f: { ...DATA1, a: 1 } }, path => {
    if (path === '$.f') {
      return () => true
    }
  }) === true
)

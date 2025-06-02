import { assertTrue } from './assert'
import { shallowClone, deepClone } from 'airset'

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

const scData1 = shallowClone(DATA1)
const scData2 = shallowClone(DATA2)
const dcData1 = deepClone(DATA1)
const dcData2 = deepClone(DATA2)

assertTrue('shallowClone', scData1.a === DATA2)
assertTrue('shallowClone', dcData1 === dcData1.a.f)
assertTrue('shallowClone', dcData1.a === dcData1.a.f.a)
assertTrue('shallowClone', scData2.f === DATA2.f)
assertTrue('shallowClone', scData2.g === DATA2.g)
assertTrue('shallowClone', 'i' in scData2)
assertTrue('shallowClone', scData2.i === DATA2.i)
assertTrue('shallowClone', !Object.keys(scData2).includes('i'))

assertTrue('deepClone', dcData1.a !== DATA2)
assertTrue('deepClone', dcData1 === dcData1.a.f)
assertTrue('deepClone', dcData1.a === dcData1.a.f.a)
assertTrue('deepClone', dcData2.f !== DATA2.f)
assertTrue('deepClone', dcData2.g !== DATA2.g)
assertTrue('deepClone', dcData2.g[3] !== DATA2.g[3])
assertTrue('deepClone', 'i' in dcData2)
assertTrue('deepClone', dcData2.i !== DATA2.i)
assertTrue('deepClone', dcData2.i.a === DATA2.i.a)
assertTrue('deepClone', !Object.keys(dcData2).includes('i'))

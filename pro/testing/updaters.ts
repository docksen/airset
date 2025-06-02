import { assertTrue } from './assert'
import { deepUpdate } from 'airset'

const a1 = { a: [{ b: { c: 1 } }] }
const a2 = { a: [{ b: { c: 1 } }] }
const a3 = deepUpdate(a1, a2)
assertTrue('deepUpdate', a3[0] === true)
assertTrue('deepUpdate', a3[1] === a1)

const b1 = { a: [{ b: { c: 1 } }] }
const b2 = { a: [{ b: { c: 1 } }, 2] }
const b3 = deepUpdate(b1, b2)
assertTrue('deepUpdate', b3[0] === false)
assertTrue('deepUpdate', b3[1] === b2)
assertTrue('deepUpdate', b3[1].a !== b1.a)
assertTrue('deepUpdate', b3[1].a[0] === b1.a[0])

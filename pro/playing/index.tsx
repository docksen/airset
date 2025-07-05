import React from 'react'
import { ReactStore, useStoreState } from 'airset'

interface Data {
  value: number
  a: any
}

const DATA: Data = {
  value: 1,
  a: {
    b: [
      {
        c: 1
      }
    ]
  }
}

export default function Index() {
  const [data, store] = useStoreState(() => new ReactStore<Data>(DATA, { debug: true }))
  return (
    <div>
      <div>{data.value}</div>
      <div
        onClick={async () => {
          console.log('clicked!')
          let promise: any = undefined
          const startTime = Date.now()
          for (let i = 0; i < 100; i++) {
            const tasks = new Array(100).fill(null).map(() => (ctx: any) => {
              console.log(ctx.data.value)
              ctx.data.value = ctx.data.value + 1
            })
            promise = store.execute(...tasks)
          }
          await promise
          console.log('task millis: ' + (Date.now() - startTime))
          console.log(store)
        }}
      >
        execute
      </div>
      <div
        onClick={() => {
          console.log('clicked!')
          store.setItem('value', data.value + 1).refresh()
        }}
      >
        add 1
      </div>
      <div
        onClick={() => {
          console.log('clicked!')
          store.setItem('value', data.value + 0).refresh()
        }}
      >
        add 0
      </div>
      <div
        onClick={() => {
          console.log('clicked!')
          store.back()
        }}
      >
        prev
      </div>
      <div
        onClick={() => {
          console.log('clicked!')
          store.forward()
        }}
      >
        next
      </div>
    </div>
  )
}

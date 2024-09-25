import type { SdinConfigParams } from 'sdin'

export const sdinConfigParams: SdinConfigParams = {
  alias: {
    bin: 'src/bin',
    core: 'src/core',
    main: 'src/main',
    utils: 'src/utils'
  },
  modules: [
    {
      type: 'foundation',
      name: 'camille',
      mode: 'cjs'
    },
    {
      type: 'foundation',
      name: 'elise',
      mode: 'esm'
    },
    {
      type: 'declaration',
      name: 'diana'
    },
    {
      type: 'integration',
      name: 'urgoth',
      mode: 'umd',
      globalName: 'airset',
      externals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    }
  ]
}

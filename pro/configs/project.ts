import type { SdinProjectParams, SdinTestingParams, SdinPlayingParams } from 'sdin'

export const sdinProjectParams: SdinProjectParams = {
  testing: getSdinTestingParams(),
  playing: getSdinPlayingParams(),
  alias: {},
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
      variable: 'airset'
    }
  ]
}

function getSdinTestingParams(): SdinTestingParams {
  return {
    alias: {
      'airset': 'tar/cjs'
    }
  }
}

function getSdinPlayingParams(): SdinPlayingParams {
  return {
    alias: {
      'airset': 'src'
    },
    externals: {
      typescript: 'ts',
      react: 'React',
      'react-dom': 'ReactDOM',
      classnames: 'classNames',
      lodash: '_'
    },
    rules: [
      {
        type: 'asset',
        test: /\.md$/i,
        parser: {
          dataUrlCondition: {
            maxSize: 10240
          }
        },
        generator: {
          filename: 'raw/[name].[contenthash][ext]'
        }
      }
    ],
    metas: [
      {
        key: 'ie',
        'http-equiv': 'X-UA-Compatible',
        content: 'ie=edge'
      },
      {
        key: 'viewport',
        name: 'viewport',
        content:
          'viewport-fit=cover,width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'
      }
    ],
    links: [
      {
        key: 'favicon',
        rel: 'icon',
        type: 'image/png',
        href: '${SDIN_MODULE_ASSETS_PATH}favicon.png'
      }
    ],
    styles: [
      {
        key: 'global',
        rel: 'stylesheet',
        href: '${SDIN_MODULE_ASSETS_PATH}global.css'
      }
    ],
    scripts: [
      {
        key: 'typescript',
        defer: true,
        src: 'https://cdn.bootcdn.net/ajax/libs/typescript/5.8.2/typescript.min.js'
      },
      {
        key: 'react',
        defer: true,
        src: 'https://cdn.bootcdn.net/ajax/libs/react/18.2.0/umd/react.production.min.js'
      },
      {
        key: 'react-dom',
        defer: true,
        src: 'https://cdn.bootcdn.net/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
      },
      {
        key: 'classnames',
        defer: true,
        src: 'https://cdn.bootcdn.net/ajax/libs/classnames/2.3.1/index.min.js'
      },
      {
        key: 'lodash',
        defer: true,
        src: 'https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.min.js'
      }
    ],
    index: 'playground',
    pages: [
      {
        name: 'playground',
        title: 'Playground',
        index: './index.tsx'
      }
    ]
  }
}

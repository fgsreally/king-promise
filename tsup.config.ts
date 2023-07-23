import type { Options } from 'tsup'

export const tsup: Options = {
  entry: ['./index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,

}

export function assertTrue(label: string, actual: any) {
  if (actual) {
    console.log(`${label}: \x1B[32mpassed\x1B[0m.`)
  } else {
    console.log(`${label}: \x1B[31mfailed\x1B[0m.`)
  }
}

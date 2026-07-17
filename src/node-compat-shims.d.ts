declare module 'node:path' {
  const pathModule: any;
  export default pathModule;
}

declare module 'node:process' {
  const processModule: any;
  export default processModule;
}

declare module 'node:os' {
  const osModule: any;
  export default osModule;
}

declare module 'node:test' {
  const testModule: any;
  export default testModule;
}

declare module 'node:assert/strict' {
  const assertStrictModule: any;
  export default assertStrictModule;
}

declare module 'node:fs/promises' {
  export const writeFile: any;
  export const mkdir: any;
  export const rm: any;
  export const mkdtemp: any;
  export const readFile: any;
}

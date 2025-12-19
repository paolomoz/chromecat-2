// Type declarations for modules without types

declare module 'pixelmatch' {
  interface PixelmatchOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    aaColor?: [number, number, number];
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    diffMask?: boolean;
  }

  function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray | null,
    width: number,
    height: number,
    options?: PixelmatchOptions
  ): number;

  export = pixelmatch;
}

// Extend Cloudflare types for Browser Rendering
declare interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

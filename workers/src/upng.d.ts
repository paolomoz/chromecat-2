declare module 'upng-js' {
  interface Image {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: Frame[];
    tabs: Record<string, unknown>;
    data: ArrayBuffer;
  }

  interface Frame {
    rect: { x: number; y: number; width: number; height: number };
    delay: number;
    dispose: number;
    blend: number;
  }

  function decode(buffer: ArrayBuffer): Image;
  function encode(imgs: ArrayBuffer[], w: number, h: number, cnum: number, dels?: number[]): ArrayBuffer;
  function toRGBA8(img: Image): ArrayBuffer[];

  export { decode, encode, toRGBA8, Image, Frame };
  export default { decode, encode, toRGBA8 };
}

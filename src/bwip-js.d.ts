declare module 'bwip-js' {
  export function toCanvas(canvas: HTMLCanvasElement | string, options: any): HTMLCanvasElement;
  export function toSVG(options: any): string;
  const bwipjs: {
    toCanvas: typeof toCanvas;
    toSVG: typeof toSVG;
  };
  export default bwipjs;
}

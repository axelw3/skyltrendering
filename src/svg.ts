import { SignRenderer as _SignRenderer } from "./render.js";
import { Vec6, NewDrawingArea, Path2D as _Path2D, TextBaseline } from "./typedefs.js";

class SVGPath implements _Path2D{
    private d: string;
    private transform: Vec6 | null;

    public constructor(path?: string, m?: {a: number, b: number, c: number, d: number, e: number, f: number}){
        this.d = "";
        this.transform = (m === undefined ? null : [m.a, m.b, m.c, m.d, m.e, m.f]);

        if(path !== undefined){
            this.d = path;
        }
    }

    public moveTo(x: number, y: number): void{
        this.d += `M${x},${y}`;
    }

    public lineTo(x: number, y: number): void{
        this.d += `L${x},${y}`;
    }

    public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise: boolean): void{
        // "startAngle"/"endAngle": vinkel mätt medurs från positiva x-axeln
        // "rotation": medurs rotation
        const rs  = Math.sin(rotation),     rc  = Math.cos(rotation);
        const sas = Math.sin(startAngle),   sac = Math.cos(startAngle);
        const eas = Math.sin(endAngle),     eac = Math.cos(endAngle);

        const   x1 = x + rc * radiusX * sac - rs * radiusY * sas,
                y1 = y + rs * radiusX * sac + rc * radiusY * sas;

        const   x2 = x + rc * radiusX * eac - rs * radiusY * eas,
                y2 = y + rs * radiusX * eac + rc * radiusY * eas;

        let cwDeltaAngle = (endAngle - startAngle) % (2 * Math.PI);
        if(cwDeltaAngle < 0) cwDeltaAngle += 2 * Math.PI;

        let largeArcFlag = ((cwDeltaAngle >= Math.PI && !counterclockwise) || (cwDeltaAngle < Math.PI && counterclockwise)) ? "1" : "0";

        this.d += `${this.d.length > 0 ? "L" : "M"}${x1},${y1}A${[
            radiusX, radiusY,
            (180 * rotation) / Math.PI,
            largeArcFlag,
            counterclockwise ? "0" : "1",
            x2, y2
        ].join(",")}`;
    }

    public closePath(): void {
        this.d += "z";
    }

    public toSVGCode(fillStyle: string | null, strokeStyle: string | null, strokeWidth?: number): string{
        return `<path d="${this.d}" ${this.transform === null ? "" : `transform="matrix(${this.transform.join(" ")})" `}fill="${fillStyle ?? "none"}" stroke="${strokeStyle ?? "none"}" ${strokeStyle !== null ? `stroke-width="${strokeWidth ?? 1}"` : ""}/>`;
    }
};

export class SVGCanvas{
    private w: number;
    private h: number;

    private els: string[];

    public constructor(w: number, h: number){
        this.w = w;
        this.h = h;
        this.els = [];
    }

    public fillRect(x: number, y: number, w: number, h: number, fillStyle: string): void{
        this.els.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fillStyle}"/>`);
    }

    public fillText(text: string, x: number, y: number, font: string, fillStyle: string, baseline: TextBaseline): void{
        this.els.push(`<text x="${x}" y="${y}" dominant-baseline="${baseline.replace(/top/, "text-top").replace(/bottom/, "text-bottom").replace(/middle/, "central")}" style="font: ${font.replace(/"/g, "&quot;")}; fill: ${fillStyle};">${text}</text>`);
    }

    public fill(path: SVGPath, fillStyle: string): void{
        this.els.push(path.toSVGCode(fillStyle, null));
    }

    public stroke(path: SVGPath, strokeStyle: string, strokeWidth: number): void{
        this.els.push(path.toSVGCode(null, strokeStyle, strokeWidth));
    }

    public drawImage(image: SVGCanvas, dx: number, dy: number): void{
        this.els.push(`<g transform="translate(${dx}, ${dy})">${image.genSVG(false)}</g>`);
    }

    public genSVG(withProlog: boolean = true): string{
        return `${withProlog ? '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' : ""}<svg version="1.1" width="${this.w}" height="${this.h}" xmlns="http://www.w3.org/2000/svg">${this.els.join("")}</svg>`;
    }
};

export class SVGDrawingArea implements NewDrawingArea<SVGCanvas>{
    canv: SVGCanvas;

    public fillStyle: string;
    public strokeStyle: string;
    public lineWidth: number;
    public font: string;
    public textBaseline: TextBaseline;

    constructor(w: number, h: number){
        this.canv = new SVGCanvas(w, h);
        this.fillStyle = "transparent";
        this.strokeStyle = "#000";
        this.lineWidth = 1;
        this.font = "12px sans-serif";
        this.textBaseline = "alphabetic";
    }

    createPath2D(): _Path2D {
        return new SVGPath();
    }

    importPath2D(s: string, m?: Vec6): SVGPath {
        if(m === undefined) return new SVGPath(s);

        let [a, b, c, d, e, f] = [...m];
        return new SVGPath(s, {a, b, c, d, e, f});
    }

    fill(path: SVGPath): void{
        this.canv.fill(path, this.fillStyle);
    }

    stroke(path: SVGPath): void {
        this.canv.stroke(path, this.strokeStyle, this.lineWidth);
    }

    fillRect(x: number, y: number, w: number, h: number): void {
        this.canv.fillRect(x, y, w, h, this.fillStyle);
    }

    fillText(text: string, x: number, y: number): void {
        this.canv.fillText(text, x, y, this.font, this.fillStyle, this.textBaseline);
    }

    drawImage(image: NewDrawingArea<SVGCanvas>, dx: number, dy: number): void {
        this.canv.drawImage(image.canv, dx, dy);
    }
}
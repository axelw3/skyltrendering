import { SignElement as _SignElement } from "./render.js";
import { SignElementBaseProperties, SignElementOptions, Vec6, NewDrawingArea, Path2D as _Path2D } from "./typedefs.js";

import { createCanvas, Canvas, Path2D, SKRSContext2D, Image } from "@napi-rs/canvas";
import { readFile } from "fs/promises"

class NodeDrawingArea implements NewDrawingArea<Canvas>{
    canv: Canvas;
    private ctx: SKRSContext2D;

    constructor(w: number, h: number){
        this.canv = createCanvas(w, h);
        this.ctx = this.canv.getContext("2d");
    }

    createPath2D(s?: string, m?: Vec6 | undefined): Path2D {
        let p = new Path2D();
        let [a, b, c, d, e, f] = m === undefined ? [1, 0, 0, 1, 0, 0] : [...m];
        p.addPath(new Path2D(s), {a, b, c, d, e, f});
        return p;
    }

    set width(x: number) {
        this.canv.width = x;
    }

    set height(x: number) {
        this.canv.height = x;
    }

    transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
        this.ctx.transform(a, b, c, d, e, f);
    }

    measureText(text: string): { width: number; } {
        return this.ctx.measureText(text);
    }

    set fillStyle(x: string) {
        this.ctx.fillStyle = x;
    }

    set strokeStyle(x: string) {
        this.ctx.strokeStyle = x;
    }

    set lineWidth(x: number) {
        this.ctx.lineWidth = x;
    }

    set font(x: string) {
        this.ctx.font = x;
    }

    set textBaseline(x: string) {
        this.ctx.textBaseline = x as CanvasTextBaseline;
    }

    fill(path: Path2D): void{
        this.ctx.fill(path);
    }

    stroke(path: Path2D): void {
        this.ctx.stroke(path);
    }

    fillRect(x: number, y: number, w: number, h: number): void {
        this.ctx.fillRect(x, y, w, h);
    }

    fillText(text: string, x: number, y: number): void {
        this.ctx.fillText(text, x, y);
    }

    drawImage(image: NewDrawingArea<Canvas>, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
        this.ctx.drawImage(image.canv, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    drawSVG(url: string, dx: number, dy: number, dw: number, dh: number, sx: number = 0, sy: number = 0, sw: number = dw, sh: number = dh): Promise<void> {
        return new Promise((res, rej) => {
            let img = new Image();

            img.onload = () => {
                this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
                res();
            };

            img.onerror = rej;
            img.src = url;
        });
    }
}


export class SignElement extends _SignElement<Canvas, NodeDrawingArea>{
    constructor(opt: SignElementOptions, popt: SignElementBaseProperties | null){
        opt = _SignElement.resolveTemplate(opt);
        super(opt, popt);
        this.addCN<SignElement>(SignElement, opt);
    }

    protected override createCanvas(w?: number, h?: number): NodeDrawingArea {
        return new NodeDrawingArea(w || 300, h || 150);
    }

    protected override getText(url: string): Promise<string> {
        return readFile(url, {encoding: "utf8"});
    }
};
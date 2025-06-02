import { SignRenderer as _SignRenderer } from "./render.js";
import { Vec6, NewDrawingArea, Path2D as _Path2D, TextBaseline } from "./typedefs.js";

import { createCanvas, Canvas, Path2D, SKRSContext2D, GlobalFonts } from "@napi-rs/canvas";
import { readFile } from "fs/promises"

class NodeDrawingArea implements NewDrawingArea<Canvas>{
    canv: Canvas;
    private ctx: SKRSContext2D;

    constructor(w: number, h: number){
        this.canv = createCanvas(w, h);
        this.ctx = this.canv.getContext("2d");
    }

    createPath2D(): _Path2D {
        return new Path2D();
    }

    importPath2D(s: string, m?: Vec6 | undefined): Path2D {
        let p = new Path2D();
        let [a, b, c, d, e, f] = m === undefined ? [1, 0, 0, 1, 0, 0] : [...m];
        p.addPath(new Path2D(s), {a, b, c, d, e, f});
        return p;
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

    set textBaseline(x: TextBaseline) {
        this.ctx.textBaseline = x;
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

    drawImage(image: NewDrawingArea<Canvas>, dx: number, dy: number): void {
        this.ctx.drawImage(image.canv, dx, dy);
    }
}


export class SignRenderer extends _SignRenderer<Canvas, NodeDrawingArea>{
    protected override createCanvas(w?: number, h?: number): NodeDrawingArea {
        return new NodeDrawingArea(w || 300, h || 150);
    }

    protected override getText(url: string): Promise<string> {
        return readFile(url, {encoding: "utf8"});
    }

    public override async registerFont(familyName: string, src: string): Promise<void> {
        GlobalFonts.registerFromPath(src, familyName);
    }
};
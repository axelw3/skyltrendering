import { SignRenderer as _SignRenderer } from "./render.js";
import { Vec6, NewDrawingArea, TextBaseline } from "./typedefs.js";


class BrowserDrawingArea implements NewDrawingArea<HTMLCanvasElement>{
    canv: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(w: number, h: number){
        this.canv = Object.assign(document.createElement("canvas"), {width: w, height: h});
        this.ctx = this.canv.getContext("2d") as CanvasRenderingContext2D;
    }

    createPath2D(): Path2D {
        return new window.Path2D();
    }

    importPath2D(s: string, m?: Vec6 | undefined): Path2D {
        let p = new window.Path2D();
        let [a, b, c, d, e, f] = m === undefined ? [1, 0, 0, 1, 0, 0] : [...m];
        p.addPath(new window.Path2D(s), {a, b, c, d, e, f});
        return p;
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

    fill(path: Path2D): void {
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

    drawImage(image: NewDrawingArea<HTMLCanvasElement>, dx: number, dy: number): void {
        this.ctx.drawImage(image.canv, dx, dy);
    }
}

export class SignRenderer extends _SignRenderer<HTMLCanvasElement, BrowserDrawingArea>{
    protected override createCanvas(w?: number, h?: number): BrowserDrawingArea {
        return new BrowserDrawingArea(w ?? 300, h ?? 150);
    }

    protected override getText(url: string): Promise<string> {
        return new Promise(resolve => {
            let req = new XMLHttpRequest();
            req.addEventListener("load", () => {
                resolve(req.responseText);
            });
            req.open("GET", url);
            req.send();
        });
    }

    protected override async _registerFont(familyName: string, src: string): Promise<void> {
        const font = new FontFace(
            familyName,
            `url('${src.replace(/\'/g, "\\'")}')`,
        );
        document.fonts.add(font);

        await font.load();
    }

    protected override measureText(text: string, font: string): { width: number; } {
        let ctx_temp = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
        ctx_temp.font = font;
        return ctx_temp.measureText(text);
    }
};
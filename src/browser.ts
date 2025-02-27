import { SignElement as _SignElement } from "./render.js";
import { SignElementBaseProperties, SignElementOptions, Vec6, NewDrawingArea } from "./typedefs.js";


class BrowserDrawingArea implements NewDrawingArea<HTMLCanvasElement>{
    canv: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(w?: number, h?: number){
        this.canv = Object.assign(document.createElement("canvas"), {width: w || 300, height: h || 150});
        this.ctx = this.canv.getContext("2d") as CanvasRenderingContext2D;
    }

    createPath2D(s?: string | undefined, m?: Vec6 | undefined): Path2D {
        let p = new window.Path2D();
        let [a, b, c, d, e, f] = m === undefined ? [1, 0, 0, 1, 0, 0] : [...m];
        p.addPath(new window.Path2D(s), {a, b, c, d, e, f});
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

    set textBaseline(x: string) {
        this.ctx.textBaseline = x as CanvasTextBaseline;
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

export class SignElement extends _SignElement<HTMLCanvasElement, BrowserDrawingArea>{
    constructor(opt: SignElementOptions, popt: SignElementBaseProperties | null){
        opt = _SignElement.resolveTemplate(opt);
        super(opt, popt);
        this.addCN<SignElement>(SignElement, opt);
    }

    protected override createCanvas(w?: number, h?: number): BrowserDrawingArea {
        return new BrowserDrawingArea(w, h);
    }

    protected getText(url: string): Promise<string> {
        return new Promise(resolve => {
            let req = new XMLHttpRequest();
            req.addEventListener("load", () => {
                resolve(req.responseText);
            });
            req.open("GET", url);
            req.send();
        });
    }
};
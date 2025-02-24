import { SignElement as _SignElement } from "./render.js";
import { SignElementBaseProperties, SignElementOptions, Vec6, Path2D as _Path2D } from "./typedefs.js";


export class SignElement extends _SignElement<HTMLCanvasElement>{
    constructor(opt: SignElementOptions, popt: SignElementBaseProperties | null){
        opt = _SignElement.resolveTemplate(opt);
        super(opt, popt);
        this.addCN<SignElement>(SignElement, opt);
    }

    protected override _createCanvas(w?: number, h?: number): HTMLCanvasElement {
        return Object.assign(document.createElement("canvas"), {width: w || 300, height: h || 150});
    }

    protected override _createPath2D(s: string, m?: Vec6): _Path2D {
        let p = new Path2D();
        let [a, b, c, d, e, f] = m === undefined ? [1, 0, 0, 1, 0, 0] : [...m];
        p.addPath(new Path2D(s), {a, b, c, d, e, f});
        return p;
    }
};
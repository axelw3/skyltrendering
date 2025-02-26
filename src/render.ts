import type { MathEnv, Vec4, SignElementProperties, SignElementOptions, SignElementBaseProperties, RenderingResult, Vec6, NewDrawingArea } from "./typedefs.js"
import CONFIG from "./config.js";
import { roundedFill, roundedFrame } from "./graphics.js";
import { mathEval, parseVarStr } from "./utils.js";

// Priority:
// 1. Specified value
// 2. Value from parent (if property is inherited) or DEFAULTS (if root)
// 3. Default value (from DEFAULT_PROPERTIES)
// 4. Global defaults (GLOBAL_DEFAULTS)

const GLOBAL_DEFAULTS = CONFIG.properties.globalDefaults;
const DEFAULTS = CONFIG.properties.rootDefaults;
const DEFAULT_PROPERTIES = CONFIG.properties.defaults;

const SKYLTTYPER = CONFIG.signTypes;
const SYMBOLER = CONFIG.symbols;

// Samtliga designer sparas i "nedre kant"-form, dvs.
// i en orientering motsvarande klammern i skylt
// F9 (samlingsmärke för vägvisning).
const BORDER_FEATURES = CONFIG.borderFeatures;

const TEMPLATES = CONFIG.templates;

function to4EForm(data: number[] | number): Vec4{
    if(!Array.isArray(data)) data = [ data, data ];
    if(data.length != 4) data = [ data[0], data[1], data[0], data[1] ];
    return [data[0], data[1], data[2], data[3]];
}

class BorderElement{
    env: MathEnv;
    w: number;
    h: number;
    n: string;

    constructor(featureName: string, bw: number, brA: number, brB: number, sideLength: number){
        let w0 = BORDER_FEATURES[featureName].w,
            cvr = !!BORDER_FEATURES[featureName].cover;

        if(cvr) w0 = sideLength - bw;

        this.env = BorderElement.calculateEnv(featureName, bw, brA, brB, w0);

        let h0 = mathEval(BORDER_FEATURES[featureName].h, this.env);

        this.env["h"] = h0;

        this.w = w0 + bw;
        this.h = h0 + bw;
        this.n = featureName;
    }

    static calculateEnv(featureName: string, bw: number, brA: number, brB: number, w0: number): MathEnv{
        let env: MathEnv = {bra: brA, brb: brB, bw: bw, w: w0};

        let feature = BORDER_FEATURES[featureName];
        if(!Array.isArray(feature.vars)) return env;

        for(let i = 0; i < feature.vars.length; i++){
            env[feature.vars[i][0]] = mathEval(feature.vars[i][1], env);
        }

        return env;
    }
}

class BorderDimensions{
    h: Vec4;
    el: (BorderElement | null)[];

    constructor(heights: Vec4){
        this.h = [...heights];
        this.el = [null, null, null, null];
    }

    set(i: number, el: BorderElement){
        this.el[i] = el;
        this.h[i] = Math.floor(el.h);
    }
}

export abstract class SignElement<C, T extends NewDrawingArea<C>>{
    protected abstract createCanvas(w?: number, h?: number): T;
    protected abstract getText(url: string): Promise<string>;

    private static borderSize(innerWidth: number, innerHeight: number, properties: SignElementProperties){
        let bs = new BorderDimensions(properties.borderWidth);

        if(properties.borderFeatures["left"] !== undefined)
            bs.set(0, new BorderElement(properties.borderFeatures["left"], properties.borderWidth[0], properties.borderRadius[0], properties.borderRadius[3], innerHeight + properties.borderWidth[1] + properties.borderWidth[3]));

        if(properties.borderFeatures["right"] !== undefined)
            bs.set(2, new BorderElement(properties.borderFeatures["right"], properties.borderWidth[2], properties.borderRadius[2], properties.borderRadius[1], innerHeight + properties.borderWidth[1] + properties.borderWidth[3]));

        if(properties.borderFeatures["top"] !== undefined)
            bs.set(1, new BorderElement(properties.borderFeatures["top"], properties.borderWidth[1], properties.borderRadius[1], properties.borderRadius[0], innerWidth + properties.borderWidth[0] + properties.borderWidth[2]));

        if(properties.borderFeatures["bottom"] !== undefined)
            bs.set(3, new BorderElement(properties.borderFeatures["bottom"], properties.borderWidth[3], properties.borderRadius[3], properties.borderRadius[2], innerWidth + properties.borderWidth[0] + properties.borderWidth[2]));

        return bs;
    }

    private static calculateAlignmentOffset(alignMode: string | undefined, innerWidth: number, outerWidth: number){
        switch(alignMode){
            case "center":
                return Math.floor((outerWidth - innerWidth) / 2);
            case "right":
                return outerWidth - innerWidth;
            default:
                // "left" or unknown value (left-aligned is the default)
                return 0;
        }
    }

    private renderBorderFeature(ctx: NewDrawingArea<any>, x0: number, y0: number, featureName: string, side: string, bs: BorderDimensions, borderBoxInnerW: number, innerHeight: number){
        let color = this.properties.color,
            background = this.properties.background;

        let lr = (side === "left" || side === "right");
        let bri = lr ? (side === "left" ? 0 : 2) : (side === "top" ? 1 : 3);

        let bw = this.properties.borderWidth[bri];
        let s = [bs.el[bri]?.w || 0, bs.h[bri]];

        let feature = BORDER_FEATURES[featureName];

        let w = lr ? s[1] : s[0],
            h = lr ? s[0] : s[1];

        switch(side){
            case "bottom":
                y0 += innerHeight + bs.h[1];
            case "top":
                x0 += bs.h[0] + Math.floor((borderBoxInnerW - w) / 2);
                break;
            case "right":
                x0 += borderBoxInnerW + bs.h[0];
            default:
                y0 += bs.h[1] + Math.floor((innerHeight - h) / 2);
                break;
        }

        // left:    cos 0   sin -1
        // top:     cos -1  sin 0
        // right:   cos 0   sin 1
        // bottom:  cos 1   sin 0

        let sr = lr ? (side === "left" ? 1 : (-1)) : 0, cr = lr ? 0 : (side === "top" ? (-1) : 1);
        let [a, b] = [(s[0] - bw) / 2, (s[1] - bw) / 2];

        let tm: Vec6 = [
            cr, sr, -sr, cr, (x0 + w / 2) - a*cr + b*sr, (y0 + h / 2) - a*sr - b*cr
        ];

        //ctx.fillStyle="#000";
        //ctx.fillRect(x0, y0, w, h);

        ctx.fillStyle = background;
        ctx.fillRect(x0 + (side === "left" ? (s[1] - bw) : 0) + (lr ? 0 : (bw/2)), y0 + (side === "top" ? (s[1] - bw) : 0) + (lr ? (bw/2) : 0), lr ? bw : (s[0] - bw), lr ? (s[0] - bw) : bw);

        ctx.lineWidth = bw;

        feature.paths.forEach(path => {
            let p = ctx.createPath2D(parseVarStr(path.p, bs.el[bri]?.env), tm);

            if(path.f !== undefined){
                ctx.fillStyle = [color, background][Math.abs(path.f)-1];
                if(path.f > 0 || this.properties.fillCorners) ctx.fill(p);
            }

            if(path.s !== undefined){
                ctx.strokeStyle = [color, background][Math.abs(path.s)-1];
                if(path.s > 0 || this.properties.fillCorners) ctx.stroke(p);
            }
        });
    }

    private type: string;
    private properties: SignElementProperties;
    private children: SignElement<C, T>[];
    private nodes: {[key: string]: {signelement: SignElement<C, T>, anchor: {x?: string, y?: string}}};

    protected static resolveTemplate(data: SignElementOptions): SignElementOptions{
        while(data.type.startsWith("#")){
            let templateName = data.type.slice(1);
            if(!TEMPLATES[templateName]){
                alert("ERROR: Unknown template \"" + templateName + "\".")
                break;
            }

            let template = TEMPLATES[templateName](...(data.params || []));
            template.properties = Object.assign(template.properties || {}, data.properties);
            data = template;
        }

        return data;
    }

    protected constructor(data: SignElementOptions, parentProperties: SignElementBaseProperties | null){
        this.type = data.type;

        let prop = Object.assign(
            {},
            GLOBAL_DEFAULTS,
            DEFAULT_PROPERTIES[data.type.startsWith(".") ? "." : data.type],
            parentProperties === null ? DEFAULTS : parentProperties,
            data.properties
        );

        this.properties = Object.assign(prop, {
            padding: to4EForm(prop.padding),
            borderRadius: to4EForm(prop.borderRadius),
            borderWidth: to4EForm(prop.borderWidth)
        });

        this.children = [];
        this.nodes = {};
    }

    protected addCN<X extends SignElement<C, T>>(Cl: new (opt: any, inh: SignElementBaseProperties | null) => X, data: SignElementOptions){
        let inh = this.getInhProperties();

        this.children = (data.elements || []).map(element => new Cl(element, inh));

        Object.entries(data.nodes || {}).forEach(e => {
            this.nodes[e[0]] = {
                signelement: new Cl(e[1].data, inh),
                anchor: e[1].anchor
            }
        });
    }

    private getInhProperties(): SignElementBaseProperties{
        const { background, borderRadius, color, font, lineHeight, lineSpacing, xSpacing } = this.properties;
        return { background, borderRadius, color, font, lineHeight, lineSpacing, xSpacing };
    }

    private _render(): RenderingResult<C, T>{
        let firstLastCenter: Vec4 = [NaN, NaN, NaN, NaN]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        let padding = Array.from(this.properties.padding);

        let width = 0, height = 0, maxHeight = 0;
        let renderPromise: (ctx: T, x0: number, y0: number, maxInnerHeight: number) => Promise<void>
            = () => Promise.resolve();

        if(this.type == "skylt"){
            let w = [0], h = [0], j = 0;

            let totalLineSpacing = 0;

            let ch = this.children.map((c, i) => {
                let re = c._render();
                let c2 = { isn: c.type == "newline", r: re, bs: re.bs, row: j, x: 0 };

                if(c2.isn || (i > 0 && this.properties.blockDisplay)){
                    c2.row = ++j;
                    w.push(0);
                    h.push(0);
                    totalLineSpacing += (this.properties.blockDisplay ? this.properties.lineSpacing : c.properties.lineSpacing);
                }

                if(!c2.isn){
                    if(w[j] > 0){
                        w[j] += this.properties.xSpacing;
                    }

                    c2.x = w[j];
                    w[j] += c2.r.w + c2.bs[0] + c2.bs[2];

                    let h0 = c2.r.h + c2.bs[1] + c2.bs[3];
                    if(h0 > h[j]) h[j] = h0;
                }

                return c2;
            });

            width = Math.max(...w);
            height = h.reduce((a, b) => a + b, totalLineSpacing);

            ch = ch.map(c2 => {
                if(!c2.isn && !this.properties.blockDisplay){
                    c2.x += SignElement.calculateAlignmentOffset(this.properties.alignContents, w[c2.row], width);
                }

                return c2;
            });

            // mitt-x (element), se även if-sats nedan
            // mitt-y (rad), se även if-sats nedan
            firstLastCenter = [
                padding[0] + ch[0].x + ch[0].bs[0],
                padding[1],
                padding[0] + ch[ch.length - 1].x + ch[ch.length - 1].bs[0],
                height + padding[1]
            ];

            if(this.properties.passAnchor){
                firstLastCenter[0] += ch[0].r.flc[0];
                firstLastCenter[1] += ch[0].bs[1] + ch[0].r.flc[1];
                firstLastCenter[2] += ch[ch.length - 1].r.flc[2];
                firstLastCenter[3] += ch[ch.length - 1].bs[1] - h[h.length - 1] + ch[ch.length - 1].r.flc[3];
            }else{
                firstLastCenter[0] += Math.floor(ch[0].r.w / 2);
                firstLastCenter[1] += Math.floor(h[0] / 2);
                firstLastCenter[2] += Math.floor(ch[ch.length - 1].r.w / 2);
                firstLastCenter[3] += Math.floor(-h[h.length - 1] / 2);
            }

            let y = 0;

            renderPromise = (ctx, x0, y0, _) => Promise.all(ch.map((c2, i) => {
                if(c2.isn || (i > 0 && this.properties.blockDisplay)){
                    y += (this.properties.blockDisplay ? this.properties.lineSpacing : this.children[i].properties.lineSpacing);
                    y += h[c2.row - 1];
                }

                if(c2.isn) return;

                let dx = 0, iw = this.properties.blockDisplay ? (width - c2.bs[0] - c2.bs[2]) : c2.r.w;

                if(this.properties.blockDisplay){
                    dx += SignElement.calculateAlignmentOffset(this.children[i].properties.alignContents, w[c2.row], iw + c2.bs[0] + c2.bs[2]);
                }

                return c2.r.doRender(
                    ctx,
                    x0 + padding[0] + c2.x, y0 + padding[1] + y,
                    dx,
                    h[c2.row] - c2.bs[1] - c2.bs[3],
                    this.properties.alignContentsV,
                    iw
                );
            })).then(() => {});
        }else if(this.type == "vagnr" || this.type == "text"){
            let ctx_temp = this.createCanvas();

            ctx_temp.font = "32px " + this.properties.font;

            width = Math.floor(ctx_temp.measureText(this.properties.value || "").width);
            height = this.properties.lineHeight;

            renderPromise = (ctx, x0, y0, _) => new Promise(res => {
                if(this.properties.dashedInset){
                    let bw = this.properties.borderWidth;

                    roundedFrame(
                        ctx,
                        x0 + 2*bw[0], y0 + 2*bw[1],
                        width + padding[0] + padding[2] - 2*bw[0] - 2*bw[2], height + padding[1] + padding[3] - 2*bw[1] - 2*bw[3],
                        bw,
                        this.properties.color,
                        this.properties.borderRadius,
                        [10, 10]
                    );
                }

                ctx.font = "32px " + this.properties.font;
                ctx.textBaseline = "middle";

                ctx.fillStyle = this.properties.color;
                ctx.fillText(this.properties.value || "", x0 + padding[0], y0 + firstLastCenter[1]);

                res();
            });
        }else if(this.type == "symbol"){
            let symbolType = SYMBOLER[this.properties.type || ""];

            width = symbolType.width;
            [height, maxHeight] = symbolType.height;

            renderPromise = (ctx, x0, y0, maxInnerHeight) => new Promise((res, rej) => {
                let url = "svg/symbol/" + (this.properties.type || "") + ".svg";

                this.getText(url).then(xml => {
                    return ctx.drawSVG(
                        "data:image/svg+xml;utf8,"
                            + encodeURIComponent(xml.replace(/currentColor/g, this.properties.color))
                            + "#" + encodeURIComponent(this.properties.variant || symbolType.default),
                        x0 + padding[0], y0 + padding[1], // dx, dy
                        width, maxInnerHeight - padding[1] - padding[3] // dw=sw, dh=sh
                    );
                }).then(res, rej);
            });
        }else if(this.type == "newline"){
            width = 0;
            height = 0;
        }else if(this.type.startsWith(".")){
            let t = SKYLTTYPER[this.type.slice(1)];
            let keys = Object.keys(t.nodes).sort().filter(nodeName => !!this.nodes[nodeName]);

            let svgBox = Array.from(t.core);
            keys.forEach(nodeName => {
                svgBox[0] = Math.min(svgBox[0], t.nodes[nodeName].x[0]);
                svgBox[1] = Math.max(svgBox[1], t.nodes[nodeName].x[1]);
                svgBox[2] = Math.min(svgBox[2], t.nodes[nodeName].y[0]);
                svgBox[3] = Math.max(svgBox[3], t.nodes[nodeName].y[1]);
            });

            let boundingBox = [
                svgBox[0] * t.width,
                svgBox[1] * t.width,
                svgBox[2] * t.height,
                svgBox[3] * t.height
            ].map(Math.floor);

            // fonts and svg loaded successfully
            let r = keys.map(nodeName => {
                let n = this.nodes[nodeName];
                let s = n.signelement;

                let tn = t.nodes[nodeName];

                n.anchor = Object.assign({ "x": tn.ax, "y": tn.ay }, n.anchor);

                let result = s._render();
                let bs = result.bs;

                let rse = [ result.w + bs[0] + bs[2], result.h + bs[1] + bs[3] ];

                let lx = tn.x.map(x => x * t.width).map(Math.floor), ty = tn.y.map(y => y * t.height).map(Math.floor);
                let leftX: number = 0, topY: number = 0;

                switch(n.anchor.x){
                    case "right":
                        leftX = lx[1] - rse[0];
                        break;
                    case "center":
                        leftX = Math.floor((lx[0] + lx[1]) / 2 - Math.floor(rse[0] / 2));
                        break;
                    case "center-first":
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[0];
                        break;
                    case "center-last":
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[2];
                        break;
                    default:
                        leftX = lx[0];
                }

                switch(n.anchor.y){
                    case "bottom":
                        topY = ty[1] - rse[1];
                        break;
                    case "middle":
                        topY = Math.floor((ty[0] + ty[1]) / 2) - Math.floor(rse[1] / 2);
                        break;
                    case "middle-first":
                        topY = Math.floor((ty[0] + ty[1]) / 2) - result.flc[1] - bs[1];
                        break;
                    case "middle-last":
                        topY = Math.floor((ty[0] + ty[1]) / 2) - result.flc[3] - bs[1];
                        break;
                    default:
                        topY = ty[0];
                }

                boundingBox = [
                    Math.min(boundingBox[0], leftX),
                    Math.max(boundingBox[1], leftX + rse[0]),
                    Math.min(boundingBox[2], topY),
                    Math.max(boundingBox[3], topY + rse[1])
                ];

                return { renderPromise: result, x: leftX, y: topY, p: s.properties };
            });

            width = boundingBox[1] - boundingBox[0];
            height = boundingBox[3] - boundingBox[2];

            renderPromise = (ctx, x0, y0, _) => Promise.all(r.map(res => {
                let x1 = res.x - boundingBox[0],
                    y1 = res.y - boundingBox[2];

                let dx = 0;

                return res.renderPromise.doRender(ctx, x0 + padding[0] + x1, y0 + padding[1] + y1, dx, res.renderPromise.h, this.properties.alignContentsV);
            })).then(() => {
                if(t.width == 0 || t.height == 0) return;

                svgBox[0] = Math.min(1, Math.max(0, boundingBox[0] / t.width));
                svgBox[1] = Math.max(0, Math.min(1, boundingBox[1] / t.width));
                svgBox[2] = Math.min(1, Math.max(0, boundingBox[2] / t.height));
                svgBox[3] = Math.max(0, Math.min(1, boundingBox[3] / t.height));

                let crop = [
                    svgBox[0] * t.width,
                    svgBox[2] * t.height,
                    (svgBox[1] - svgBox[0]) * t.width,
                    (svgBox[3] - svgBox[2]) * t.height
                ]; // [x0, y0, w, h]

                return ctx.drawSVG(
                    "svg/" + this.type.slice(1) + ".svg#" + keys.join("_"),
                    x0 + this.properties.padding[0] - boundingBox[0] + crop[0], // dx
                    y0 + this.properties.padding[1] - boundingBox[2] + crop[1], // dy
                    crop[2], crop[3], // dw=sw, dh=sh
                    crop[0], crop[1] // sx, sy
                );
            });
        }else{
            alert("Fel!");
        }

        let bs = SignElement.borderSize(width + padding[0] + padding[2], height + padding[1] + padding[3], this.properties);

        if(firstLastCenter.some(isNaN)){
            firstLastCenter = [
                Math.floor((width + padding[0] + padding[2]) / 2),
                Math.floor((height + padding[1] + padding[3]) / 2),
                Math.floor((width + padding[0] + padding[2]) / 2),
                Math.floor((height + padding[1] + padding[3]) / 2)
            ];
        }

        if(maxHeight < height) maxHeight = height;

        return {
            flc: firstLastCenter,
            w: width + padding[0] + padding[2],
            h: height + padding[1] + padding[3],
            bs: bs.h,
            doRender: async (ctx: T, x0: number, y0: number, dx: number, maxInnerHeight: number, verticalAlign?: string, iw = 0) => {
                const dy = 0;
                const innerWidth = iw === 0 ? (width + padding[0] + padding[2]) : iw;
                let innerHeight = height + padding[1] + padding[3];

                if(this.properties.grow && innerHeight < maxInnerHeight){
                    innerHeight = Math.min(maxInnerHeight, padding[1] + padding[3] + maxHeight);
                }

                switch (verticalAlign) {
                    case "middle":
                        y0 += Math.floor((maxInnerHeight - innerHeight) / 2);
                        break;
                    case "bottom":
                        y0 += maxInnerHeight - innerHeight;
                        break;
                }

                // tag bort rundade hörn på sidor med hela kantutsmyckningar
                let bfs = ["left", "top", "right", "bottom"].map(s => {
                    let bf = this.properties.borderFeatures[s];
                    return bf !== undefined && BORDER_FEATURES[bf].cover; // cover => hel, täcker hela kantens längd
                });

                let br: Vec4 = [...this.properties.borderRadius],
                    bw: Vec4 = [...this.properties.borderWidth];

                for(let i = 0; i < 4; i++){
                    if(bfs[i] || bfs[(i + 1) % 4]) br[i] = 0;
                    if(bfs[i]) bw[i] = 0;
                }

                roundedFill(
                    ctx,
                    x0 + bs.h[0], y0 + bs.h[1],
                    innerWidth, innerHeight,
                    bw,
                    br,
                    this.properties.background,
                    !!this.properties.fillCorners
                );

                await renderPromise(ctx, x0 + dx + bs.h[0], y0 + dy + bs.h[1], innerHeight);

                roundedFrame(
                    ctx,
                    x0 + bs.h[0], y0 + bs.h[1],
                    innerWidth, innerHeight,
                    bw,
                    this.properties.color,
                    br
                );

                Object.entries(this.properties.borderFeatures).forEach(feature => {
                    this.renderBorderFeature(ctx, x0, y0, feature[1], feature[0], bs, innerWidth, innerHeight);
                });
            }
        };
    }

    public async render(): Promise<C>{
        let canv = this.createCanvas();

        let r = this._render();

        let bs = r.bs;
        Object.assign(canv, { width: r.w + bs[0] + bs[2], height: r.h + bs[1] + bs[3] });

        if(canv === null) throw new Error("Fel: Kunde inte hitta tvådimensionell renderingskontext.");

        await r.doRender(canv, 0, 0, 0, r.h);
        return canv.canv;
    }
}
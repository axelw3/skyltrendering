import type { MathEnv, Vec4, SignElementProperties, SignElementOptions, SignElementBaseProperties, RenderingResult, Vec6, NewDrawingArea, JSONVec, JSONVecReference, ConfigData, BorderFeatureDefinition, UserConfigData, PropertiesDefaults, Vec5, AlignModeX, AlignModeY, SignElementRequiredProperties, SignElementUserProperties, SignElementDimProperties, Vec2, RenderingResultOpt } from "./typedefs.js"
import { roundedFill, roundedFrame } from "./graphics.js";
import { mathEval, parseVarStr } from "./utils.js";
import { VectorFont } from "./font.js";

const propertiesDefaults: PropertiesDefaults = {
    "globalDefaults": { "borderFeatures": {}, "borderWidth": 0, "padding": 0, "xSpacing": 8 },
    "rootDefaults": { "background": "#06a", "color": "white", "cover": true, "borderRadius": 8, "borderWidth": 3, "font": "sans-serif", "fontSize": 32, "lineHeight": 46, "lineSpacing": 4, "fillCorners": true },
    "defaults": {
        ".": { "padding": 8 },
        "group": { "background": "transparent", "borderWidth": 0, "lineSpacing": 0, "padding": 0 }, // dessa värden ärvs aldrig vidare
        "skylt": { "alignContentsV": "middle", "padding": 6 },
        "vagnr": { "borderWidth": 3, "padding": [14, 2], "xSpacing": 0 },
        "text": {},
        "newline": {},
        "symbol": { "alignContents": "center", "alignContentsV": "middle", "grow": true, "padding": 3, "type": "default" }
    }
};

// Bestämning av värde på elementegenskaper görs enligt följande prioriteringsordning:
// 1. Specificerat värde
// 2. Värde från förälder (om egenskapen kan ärvas) eller från rootDefaults (endast rotelement)
// 3. Typspecifikt standardvärde (från defaults)
// 4. Globalt standardvärde (från globalDefaults)

function to4EForm(data: (number | null)[] | number | null, fb: Vec4 | Vec5 = [0, 0, 0, 0]): Vec4{
    if(!Array.isArray(data ??= fb)) return [data, data, data, data];

    let a = data[0] ?? (data.length > 0 ? fb[0] : 0);
    let b = data[1] ?? (data.length > 1 ? fb[1] : a),
        c = data[2] ?? (data.length > 2 ? fb[2] : a);
    let d = data[3] ?? (data.length > 3 ? fb[3] : b);

    return [a, b, c, d];
}

function to5EForm(data: (number | null)[] | number | null, fb: Vec5 = [0, 0, 0, 0, 0]): Vec5{
    if(!Array.isArray(data ??= fb)) return [data, data, data, data, data];
    let v4 = to4EForm(data, fb);
    return [
        ...v4,
        data[4] ?? (data.length > 4 ? fb[4] : Math.min(...v4))
    ];
}

class BorderElement{
    env: MathEnv;

    /**
     * Kantelementets *yttre* bredd (dvs. inklusive ev. +bw), *före rotation*.
     * 
     * Om `cover == true` är detta värde lika med `sideOuterLength`, dvs. skyltelementets
     * yttre höjd (`left`/`right`) eller bredd (`top`/`bottom`).
     */
    w: number;

    /**
     * Kantelementets *yttre* höjd (inklusive +bw), *före rotation*.
     */
    h: number;

    constructor(feature: BorderFeatureDefinition, bw: number, brA: number, brB: number, brC: number, brD: number, sideOuterLength: number, perpOuterLength: number){
        this.w = feature.w === undefined ? sideOuterLength : (feature.w + bw);
        this.env = this.calculateEnv(feature, bw, brA, brB, brC, brD);
        this.h = feature.h === undefined ? perpOuterLength : (mathEval(feature.h, this.env) + bw);

        // h: *inre* djup/höjd för kantelementet (dvs. exklusive +bw)
        this.env["h"] = this.h - bw;
    }

    private calculateEnv(feature: BorderFeatureDefinition, bw: number, brA: number, brB: number, brC: number, brD: number): MathEnv{
        // w: längd/bredd/sidlängd för kantelementet
        let env: MathEnv = {bra: brA, brb: brB, brc: brC, brd: brD, bw: bw, w: this.w - bw};

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

    constructor(bw: Vec4 | Vec5){
        this.h = [bw[0], bw[1], bw[2], bw[3]];
        this.el = [null, null, null, null, null];
    }

    set(i: number, el: BorderElement){
        this.el[i] = el;
        if(i < 4) this.h[i] = Math.floor(el.h);
    }
}

export abstract class SignRenderer<C, T extends NewDrawingArea<C>>{
    protected abstract createCanvas(w?: number, h?: number): T;
    protected abstract getText(url: string): Promise<string>;

    public abstract registerFont(familyName: string, src: string): Promise<void>;

    public async registerVectorFont(name: string, src: string): Promise<void>{
        let data = await this.getText(src);
        let parsed = JSON.parse(data);
        let font = new VectorFont(parsed);
        this.vectorFonts.set(name, font);
    }

    private fitContents(outerWidth: number, outerHeight: number, properties: SignElementProperties): Vec2{
        let bw = properties.borderWidth;

        let innerWidth = outerWidth - bw[0] - bw[2],
            innerHeight = outerHeight - bw[1] - bw[3];

        while(true){
            let bs = this.borderSize(innerWidth, innerHeight, properties);
            let shX = (bs.h[0] + bs.h[2] + innerWidth) > outerWidth,
                shY = (bs.h[1] + bs.h[3] + innerHeight) > outerHeight;

            if(shX) innerWidth--;

            if(shY) innerHeight--;
            else if(!shX) break;
        }

        return [innerWidth, innerHeight];
    }

    private borderSize(innerWidth: number, innerHeight: number, properties: SignElementProperties){
        let bw = properties.borderWidth,
            br = properties.borderRadius,
            bf = properties.borderFeatures;

        let bs = new BorderDimensions(bw);

        if(bf["left"] !== undefined)
            bs.set(0, new BorderElement(this.conf.borderFeatures[bf["left"]], bw[0], br[3], br[0], br[1], br[2], innerHeight + bw[1] + bw[3], innerWidth + bw[0] + bw[2]));

        if(bf["right"] !== undefined)
            bs.set(2, new BorderElement(this.conf.borderFeatures[bf["right"]], bw[2], br[1], br[2], br[3], br[0], innerHeight + bw[1] + bw[3], innerWidth + bw[0] + bw[2]));

        if(bf["top"] !== undefined)
            bs.set(1, new BorderElement(this.conf.borderFeatures[bf["top"]], bw[1], br[0], br[1], br[2], br[3], innerWidth + bw[0] + bw[2], innerHeight + bw[1] + bw[3]));

        if(bf["bottom"] !== undefined)
            bs.set(3, new BorderElement(this.conf.borderFeatures[bf["bottom"]], bw[3], br[2], br[3], br[0], br[1], innerWidth + bw[0] + bw[2], innerHeight + bw[1] + bw[3]));

        if(bf["overlay"] !== undefined)
            bs.set(4, new BorderElement(this.conf.borderFeatures[bf["overlay"]], bw[4], br[0], br[1], br[2], br[3], innerWidth + bw[0] + bw[2], innerHeight + bw[1] + bw[3]));

        return bs;
    }

    private static calculateAlignmentOffset(alignMode: AlignModeX | AlignModeY | undefined, innerSide: number, outerSide: number){
        switch(alignMode){
            case "center":
            case "middle":
                return Math.floor((outerSide - innerSide) / 2);
            case "right":
            case "bottom":
                return outerSide - innerSide;
            default:
                // "left" or unknown value (left-aligned is the default)
                return 0;
        }
    }

    private renderBorderFeature(ctx: NewDrawingArea<any>, x0: number, y0: number, feature: BorderFeatureDefinition, side: string, bs: BorderDimensions, innerWidth: number, innerHeight: number, prop: SignElementProperties){
        // (x0, y0) - Övre vänstra hörnet. Denna punkt är densamma som yttersta punkten på hörnet då borderRadius == 0.

        let clr = [prop.color, prop.background];

        let lr = (side === "left" || side === "right");
        let bri = ["left", "top", "right", "bottom", "overlay"].indexOf(side);

        let bw = prop.borderWidth[bri];
        let s = [bs.el[bri]?.w ?? 0, bs.el[bri]?.h ?? 0];

        switch(side){
            case "overlay":
                x0 += bs.h[0] + Math.floor((innerWidth - s[0]) / 2);
                y0 += bs.h[1] + Math.floor((innerHeight - s[1]) / 2);
                break;
            case "bottom":
                y0 += bs.h[1] + innerHeight;
            case "top":
                x0 += bs.h[0] + Math.floor((innerWidth - s[0]) / 2);
                break;
            case "right":
                x0 += bs.h[0] + innerWidth;
            case "left":
                y0 += bs.h[1] + Math.floor((innerHeight - s[0]) / 2);
                break;
            default:
                throw new Error("Okänd kantplacering: " + side);
        }

        let w = lr ? s[1] : s[0],
            h = lr ? s[0] : s[1];

        // left:    cos 0   sin -1
        // top:     cos -1  sin 0
        // right:   cos 0   sin 1
        // bottom:  cos 1   sin 0

        let sr = lr ? (side === "left" ? 1 : (-1)) : 0, cr = lr ? 0 : (side === "top" ? (-1) : 1);
        let [a, b] = [(s[0] - bw) / 2, (s[1] - bw) / 2]; // rotationspunkt

        let tm: Vec6 = [
            cr, sr, -sr, cr, (x0 + w / 2) - a*cr + b*sr, (y0 + h / 2) - a*sr - b*cr
        ];

        //ctx.fillStyle="#000";
        //ctx.fillRect(x0, y0, w, h);

        if(side !== "overlay" && !feature.clip){
            ctx.fillStyle = clr[1];
            ctx.fillRect(x0 + (side === "left" ? (s[1] - bw) : 0) + (lr ? 0 : (bw/2)), y0 + (side === "top" ? (s[1] - bw) : 0) + (lr ? (bw/2) : 0), lr ? bw : (s[0] - bw), lr ? (s[0] - bw) : bw);
        }

        ctx.lineWidth = bw;

        feature.paths.forEach(path => {
            let p = ctx.createPath2D(parseVarStr(path.p, bs.el[bri]?.env), tm);

            if(path.f !== undefined){
                ctx.fillStyle = typeof path.f === "string" ? path.f : clr[Math.abs(path.f)-1];
                if(typeof path.f === "string" || path.f > 0 || prop.fillCorners) ctx.fill(p);
            }

            if(path.s !== undefined){
                ctx.strokeStyle = typeof path.s === "string" ? path.s : clr[Math.abs(path.s)-1];
                if(typeof path.s === "string" || path.s > 0 || prop.fillCorners) ctx.stroke(p);
            }
        });
    }

    private drawVec(ctx: T, href: string, currentColor: string, components: string[], fw: number, fh: number, dx: number, dy: number, dw: number, dh: number, sx: number = 0, sy: number = 0, sw: number = dw, sh: number = dh): Promise<void>{
        return this.getText(href).then(rawJson => {
            let vecImgData = JSON.parse(rawJson) as JSONVec;
            let ctx2: T = this.createCanvas(dw, dh);

            let xf = (dw/sw) * fw / vecImgData.vectorSize[0],
                yf = (dh/sh) * fh / vecImgData.vectorSize[1];

            let tm: Vec6 = [
                xf, 0, 0,
                yf, 0, 0
            ];

            let els: JSONVecReference[];
            if(vecImgData.components !== undefined){
                els = vecImgData.core ?? [];
                Object.entries(vecImgData.components).filter(e => components.includes(e[0])).forEach(e => els.push(...e[1]));
            }else{
                els = vecImgData.defs.map(function(_: any, i: number): JSONVecReference{
                    return {use: i};
                });
            }

            els.forEach(el => {
                let def = vecImgData.defs[el.use];

                let tra = el.translate ?? [0, 0];

                [tm[4], tm[5]] = [tra[0] * xf, tra[1] * yf];

                tm[4] -= sx * dw/sw;
                tm[5] -= sy * dh/sh;

                let path = ctx2.createPath2D(def.path, tm);
                ctx2.fillStyle = def.fill === "currentColor" ? currentColor : def.fill;
                ctx2.fill(path);
            });

            ctx.drawImage(ctx2, dx, dy);
        });
    }

    private conf: ConfigData;
    private vectorFonts: Map<string, VectorFont>;

    protected resolveTemplate(opt: SignElementOptions): SignElementOptions{
        while(opt.type.startsWith("#")){
            let templateName = opt.type.slice(1);
            let templ = this.conf.templates[templateName];
            if(!templ){
                throw new Error("ERROR: Unknown template \"" + templateName + "\".");
                break;
            }

            let template = templ(...(opt.params ?? []));

            Object.assign(template.properties ??= {}, opt.properties);
            opt = template;
        }

        return opt;
    }

    public constructor(config: UserConfigData){
        this.conf = {
            globalDefaults: config.globalDefaults ?? propertiesDefaults.globalDefaults,
            rootDefaults: config.rootDefaults ?? propertiesDefaults.rootDefaults,
            defaults: config.defaults ?? propertiesDefaults.defaults,
            signTypes: config.signTypes ?? {},
            symbols: config.symbols ?? {},
            borderFeatures: config.borderFeatures ?? {},
            templates: config.templates ?? {}
        };

        this.vectorFonts = new Map<string, VectorFont>();
    }

    private static getInhProperties(prop: SignElementBaseProperties & SignElementUserProperties, overrides: SignElementUserProperties | null = null): SignElementBaseProperties{
        const { background, borderRadius, color, font, fontSize, lineHeight, lineSpacing } = prop;
        return {
            background: overrides?.background ?? background,
            borderRadius: overrides?.borderRadius ?? borderRadius,
            color: overrides?.color ?? color,
            font: overrides?.font ?? font,
            fontSize: overrides?.fontSize ?? fontSize,
            lineHeight: overrides?.lineHeight ?? lineHeight,
            lineSpacing: overrides?.lineSpacing ?? lineSpacing
        };
    }

    private _render(opt: SignElementOptions, inhProperties: SignElementBaseProperties & SignElementUserProperties, dimProperties: SignElementDimProperties, targetDim?: Vec2): RenderingResult<C, T>{
        let firstLastCenter: Vec4 = [NaN, NaN, NaN, NaN]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        opt = this.resolveTemplate(opt);

        let typeDefaults: SignElementUserProperties | null = this.conf.defaults[opt.type.startsWith(".") ? "." : opt.type] ?? null;

        let propBase: SignElementBaseProperties & SignElementRequiredProperties = Object.assign(
            Object.assign(
                {},
                this.conf.globalDefaults,
                inhProperties,
                typeDefaults
            ),
            opt.properties
        );

        let prop: SignElementProperties = Object.assign(propBase, {
            padding: to4EForm(propBase.padding, to4EForm(typeDefaults.padding !== undefined ? typeDefaults.padding : this.conf.globalDefaults.padding)),
            borderRadius: to4EForm(propBase.borderRadius, dimProperties.borderRadius),
            borderWidth: to5EForm(propBase.borderWidth, dimProperties.borderWidth)
        });

        let inh: SignElementBaseProperties & SignElementUserProperties = opt.type === "group"
            ? Object.assign({}, inhProperties, SignRenderer.getInhProperties(inhProperties, opt.properties))
            : SignRenderer.getInhProperties(prop);

        let padding = Array.from(prop.padding);

        let contentsWidth = 0, contentsHeight = 0, maxContentsHeight = -1;
        let contentBoxWidth: number | null = null, contentBoxHeight: number | null = null;

        if(targetDim !== undefined){
            let [iw, ih] = this.fitContents(targetDim[0], targetDim[1], prop);
            [contentBoxWidth, contentBoxHeight] = [iw - padding[0] - padding[2], ih - padding[1] - padding[3]];
        }

        let renderPromise: (ctx: T, x0: number, y0: number, maxInnerWidth: number, maxInnerHeight: number) => Promise<void>
            = () => Promise.resolve();

        if(opt.type === "skylt" || opt.type === "group"){
            let w = [0], h = [0], j = 0;

            let totalLineSpacing = 0;

            let colIds: number[] = (prop.columns ?? []);
            let cols: {x: number, w: number, els: number[]}[] = colIds.map(() => ({x: 0, w: 0, els: []}));

            let k = 0, preXSpacing = 0;
            let ch: RenderingResultOpt<C, T>[] = (opt.elements ?? []).map((c, i, els) => {
                let re = this._render(
                    c, inh,
                    opt.type === "group"
                        ? dimProperties
                        : {
                            borderRadius: to4EForm(opt.properties?.borderRadius ?? null, dimProperties.borderRadius),
                            borderWidth: to5EForm(opt.properties?.borderWidth ?? null, dimProperties.borderWidth)
                        }
                );

                let isNewline = c.type === "newline";
                let c2: RenderingResultOpt<C, T> = {
                    isn: isNewline,
                    r: re,
                    row: j,
                    w: 0,
                    ls: isNewline ? (c.properties?.lineSpacing ?? prop.lineSpacing) : prop.lineSpacing
                };

                let lineBreakAfter = isNewline || prop.blockDisplay;

                if(!isNewline){
                    let ew = re.minInnerWidth + re.bs[0] + re.bs[2];

                    if(k > 0){
                        w[j] += Math.max(preXSpacing, re.properties.xSpacing);
                    }

                    preXSpacing = re.properties.xSpacing;

                    if(colIds.includes(k)){
                        let l = colIds.indexOf(k);
                        cols[l].x = w[j] = Math.max(cols[l].x, w[j]); // ev. xSpacing t.v. redan inräknad
                        cols[l].w = ew = Math.max(cols[l].w, ew); // ev. xSpacing räknas INTE med
                        cols[l].els.push(i);
                    }

                    w[j] += ew;
                    c2.w += ew;

                    let h0 = re.minInnerHeight + re.bs[1] + re.bs[3];
                    if(h0 > h[j]) h[j] = h0;
                }

                if(lineBreakAfter && i + 1 < els.length){
                    j++;
                    w.push(0);
                    h.push(0);
                    totalLineSpacing += c2.ls;
                    k = 0;
                    return c2;
                }

                k++;
                return c2;
            });

            cols.forEach(c => {
                c.els.forEach(i => {
                    let ow = ch[i].w;
                    w[ch[i].row] += c.w - ow;
                    ch[i].w = c.w;
                });
            });

            contentsHeight = h.reduce((a, b) => a + b, totalLineSpacing);

            let extraH = 0;
            if(contentBoxHeight !== null && j === 0){
                extraH = contentBoxHeight - contentsHeight;
                contentsHeight = h[0] = contentBoxHeight;
            }

            contentsWidth = Math.max(...w);

            let rx = new Array(j + 1).fill(0).map((_, r) => SignRenderer.calculateAlignmentOffset(prop.alignContents, w[r], contentsWidth));

            // mitt-x (element), se även if-sats nedan
            // mitt-y (rad), se även if-sats nedan
            firstLastCenter = [
                padding[0] + rx[0] + ch[0].r.bs[0],
                padding[1],
                padding[0] + rx[j] + w[j] - ch[ch.length - 1].w + ch[ch.length - 1].r.bs[0],
                (contentBoxHeight ?? contentsHeight) + padding[1]
            ];

            if(prop.passAnchor){
                firstLastCenter[0] += ch[0].r.flc[0];
                firstLastCenter[1] += ch[0].r.bs[1] + ch[0].r.flc[1];
                firstLastCenter[2] += ch[ch.length - 1].r.flc[2];
                firstLastCenter[3] += ch[ch.length - 1].r.bs[1] - h[h.length - 1] + ch[ch.length - 1].r.flc[3];
            }else{
                firstLastCenter[0] += Math.floor(ch[0].r.minInnerWidth / 2);
                firstLastCenter[1] += Math.floor(h[0] / 2);
                firstLastCenter[2] += Math.floor(ch[ch.length - 1].r.minInnerWidth / 2);
                firstLastCenter[3] += Math.floor(-h[h.length - 1] / 2);
            }

            let x = 0, y = 0;

            renderPromise = (ctx, x0, y0, _0, _1) => Promise.all(ch.map((c2, i, els) => {
                let lineBreakAfter = c2.isn || prop.blockDisplay;

                let pro: Promise<void> | undefined;

                if(!c2.isn){
                    let iw = prop.blockDisplay ? ((contentBoxWidth ?? contentsWidth) - c2.r.bs[0] - c2.r.bs[2]) : c2.r.minInnerWidth;

                    pro = c2.r.doRender(
                        ctx,
                        x0 + padding[0] + rx[c2.row] + x, y0 + padding[1] + y,
                        prop.alignContentsV,
                        iw,
                        h[c2.row] - c2.r.bs[1] - c2.r.bs[3],
                        h[c2.row] - c2.r.bs[1] - c2.r.bs[3] - extraH
                    );
                }

                if(lineBreakAfter){
                    y += c2.ls;
                    y += h[c2.row];
                    x = 0;
                }else if(i + 1 < els.length){
                    x += c2.w + Math.max(c2.r.properties.xSpacing, els[i+1].r.properties.xSpacing);
                }

                return pro;
            })).then(() => {});
        }else if(opt.type === "vagnr" || opt.type === "text"){
            let vectorFont = this.vectorFonts.get(prop.font.slice(1, -1));

            const fontSize = prop.fontSize;
            const fontStr = `${fontSize}px ${prop.font}`;

            let txt = prop.value ?? "";

            if(vectorFont !== undefined){
                contentsWidth = Math.floor(vectorFont.measureText(txt, fontSize).width);
            }else{
                let ctx_temp = this.createCanvas();
                ctx_temp.font = fontStr;
                contentsWidth = Math.floor(ctx_temp.measureText(txt).width);
            }

            contentsHeight = prop.lineHeight;

            renderPromise = (ctx, x0, y0, _0, _1) => new Promise(res => {
                if(vectorFont !== undefined){
                    vectorFont.fillText(ctx, x0 + padding[0], y0 + padding[1] + Math.floor(prop.lineHeight / 2), txt, prop.color, fontSize);
                }else{
                    ctx.font = fontStr;
                    ctx.textBaseline = "middle";

                    ctx.fillStyle = prop.color;
                    ctx.fillText(txt, x0 + padding[0], y0 + padding[1] + Math.floor(prop.lineHeight / 2));
                }

                res();
            });
        }else if(opt.type === "symbol"){
            let symbolType = this.conf.symbols[prop.type ?? ""];

            contentsWidth = symbolType.width * (prop.scale ?? 1);
            contentsHeight = symbolType.height[0] * (prop.scale ?? 1);
            let maxSymH = prop.grow ? (prop.maxHeight ?? symbolType.height[1]) : symbolType.height[0];
            maxContentsHeight = maxSymH * (prop.scale ?? 1);

            let url = `res/symbol/${prop.type ?? "default"}.json`;
            let v: string | undefined = prop.variant ?? symbolType.default;

            renderPromise = (ctx, x0, y0, maxInnerWidth, maxInnerHeight) => this.drawVec(
                ctx, url, prop.color, v === undefined ? [] : [v],
                symbolType.width, symbolType.height[1],
                x0 + padding[0], y0 + padding[1], // dx, dy
                maxInnerWidth - padding[0] - padding[2], // dw
                maxInnerHeight - padding[1] - padding[3], // dh
                0, 0,
                symbolType.width, // sw
                Math.min((maxInnerHeight - padding[1] - padding[3]) / (prop.scale ?? 1), maxSymH) // sh
            );
        }else if(opt.type === "newline"){
            contentsWidth = 0;
            contentsHeight = 0;
        }else if(opt.type.startsWith(".") && opt.nodes !== undefined){
            let nodes = opt.nodes;
            let t = this.conf.signTypes[opt.type.slice(1)];
            let keys = Object.keys(t.nodes).sort().filter(nodeName => !!nodes[nodeName]);

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
                let n = nodes[nodeName];
                let s = n.data;

                let tn = t.nodes[nodeName];

                let ax = n.anchor?.x ?? tn.ax,
                    ay = n.anchor?.y ?? tn.ay;

                let result = this._render(s, inh, prop);
                let bs = result.bs;

                let rse = [ result.minInnerWidth + bs[0] + bs[2], result.minInnerHeight + bs[1] + bs[3] ];

                let lx = tn.x.map(x => x * t.width).map(Math.floor), ty = tn.y.map(y => y * t.height).map(Math.floor);
                let leftX: number = 0, topY: number = 0;

                switch(ax){
                    case "right":
                        leftX = lx[1] - rse[0];
                        break;
                    case "center":
                        leftX = Math.floor((lx[0] + lx[1]) / 2 - Math.floor(rse[0] / 2));
                        break;
                    case "center-first":
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[0] - bs[0];
                        break;
                    case "center-last":
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[2] - bs[0];
                        break;
                    default:
                        leftX = lx[0];
                }

                switch(ay){
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

            contentsWidth = boundingBox[1] - boundingBox[0];
            contentsHeight = boundingBox[3] - boundingBox[2];

            renderPromise = (ctx, x0, y0, _0, _1) => Promise.all(r.map(res => {
                let x1 = res.x - boundingBox[0],
                    y1 = res.y - boundingBox[2];

                return res.renderPromise.doRender(ctx, x0 + padding[0] + x1, y0 + padding[1] + y1, prop.alignContentsV);
            })).then(() => {
                if(t.width === 0 || t.height === 0) return;

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

                return this.drawVec(
                    ctx, `res/${opt.type.slice(1)}.json`, prop.color, keys,
                    t.width, t.height,
                    x0 + prop.padding[0] - boundingBox[0] + crop[0], // dx
                    y0 + prop.padding[1] - boundingBox[2] + crop[1], // dy
                    crop[2], crop[3], // dw=sw, dh=sh
                    crop[0], crop[1] // sx, sy
                );
            });
        }else{
            throw new Error("Okänd typ av element: " + String(opt.type));
        }

        const   iw0 = (contentBoxWidth ?? contentsWidth) + padding[0] + padding[2],
                ih0 = (contentBoxHeight ?? contentsHeight) + padding[1] + padding[3];

        let bs = this.borderSize(iw0, ih0, prop);

        if(firstLastCenter.some(isNaN)){
            firstLastCenter = [
                Math.floor(iw0 / 2), Math.floor(ih0 / 2),
                Math.floor(iw0 / 2), Math.floor(ih0 / 2)
            ];
        }

        if(maxContentsHeight < 0) maxContentsHeight = (contentBoxHeight ?? contentsHeight);

        return {
            flc: firstLastCenter,
            minInnerWidth: iw0,
            minInnerHeight: ih0,
            bs: bs.h,
            properties: prop,
            doRender: async (ctx: T, x0: number, y0: number, verticalAlign: AlignModeY | undefined = prop.alignContentsV, innerWidth = iw0, maxInnerHeight: number = ih0, rowInnerElHeight: number = ih0) => {
                let innerHeight = prop.grow ? Math.min(rowInnerElHeight, padding[1] + padding[3] + maxContentsHeight) : ih0;

                if(prop.grow) contentsHeight = innerHeight - padding[1] - padding[3];
                if(prop.cover) innerHeight = maxInnerHeight;

                y0 += SignRenderer.calculateAlignmentOffset(verticalAlign, innerHeight, maxInnerHeight);

                // tag bort rundade hörn på sidor med hela kantutsmyckningar
                let bfs = [prop.borderFeatures.left, prop.borderFeatures.top, prop.borderFeatures.right, prop.borderFeatures.bottom].map(bf => {
                    return bf !== undefined && this.conf.borderFeatures[bf].w === undefined; // cover => hel, täcker hela kantens längd
                });

                let br: Vec4 = [...prop.borderRadius],
                    bw: Vec4 = [prop.borderWidth[0], prop.borderWidth[1], prop.borderWidth[2], prop.borderWidth[3]];

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
                    prop.background
                );

                let dx = SignRenderer.calculateAlignmentOffset(prop.alignContents, contentsWidth, innerWidth - padding[0] - padding[2]);

                let dy = SignRenderer.calculateAlignmentOffset(prop.alignContentsV, contentsHeight, innerHeight - padding[1] - padding[3]);
                await renderPromise(ctx, x0 + bs.h[0] + dx, y0 + bs.h[1] + dy, contentsWidth + padding[0] + padding[2], contentsHeight + padding[1] + padding[3]);

                let bfts: [string, string][] = Object.entries(prop.borderFeatures).filter(feature => {
                    let bf = this.conf.borderFeatures[feature[1]];
                    if(!bf.clip) return true;
                    this.renderBorderFeature(ctx, x0, y0, bf, feature[0], bs, innerWidth, innerHeight, prop);
                    return false;
                });

                roundedFrame(
                    ctx,
                    x0 + bs.h[0], y0 + bs.h[1],
                    innerWidth, innerHeight,
                    bw,
                    prop.color,
                    prop.fillCorners ? prop.background : null,
                    br
                );

                if(prop.dashedInset){
                    let bw2 = prop.borderWidth;

                    roundedFrame(
                        ctx,
                        x0 + bs.h[0] + 2*bw2[0], y0 + bs.h[1] + 2*bw2[1],
                        innerWidth - 2*bw2[0] - 2*bw2[2], innerHeight - 2*bw2[1] - 2*bw2[3],
                        [bw2[0], bw2[1], bw2[2], bw2[3]],
                        prop.color,
                        prop.background,
                        prop.borderRadius,
                        [10, 10]
                    );
                }

                bfts.forEach(feature => {
                    this.renderBorderFeature(ctx, x0, y0, this.conf.borderFeatures[feature[1]], feature[0], bs, innerWidth, innerHeight, prop);
                });
            }
        };
    }

    public async render(data: SignElementOptions, dim?: Vec2): Promise<C>{
        let r = this._render(data, this.conf.rootDefaults, {
            borderRadius: to4EForm(this.conf.rootDefaults.borderRadius),
            borderWidth: to5EForm(this.conf.rootDefaults.borderWidth ?? this.conf.globalDefaults.borderWidth)
        }, dim);

        let bs = r.bs;
        let canv = this.createCanvas(r.minInnerWidth + bs[0] + bs[2], r.minInnerHeight + bs[1] + bs[3]);

        if(canv === null) throw new Error("Fel: Kunde inte hitta tvådimensionell renderingskontext.");

        await r.doRender(canv, 0, 0);
        return canv.canv;
    }
}
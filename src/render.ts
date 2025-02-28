import type { MathEnv, Vec4, SignElementProperties, SignElementOptions, SignElementBaseProperties, RenderingResult, Vec6, NewDrawingArea, JSONVec, JSONVecReference, ConfigData, BorderFeatureDefinition, UserConfigData, PropertiesDefaults } from "./typedefs.js"
import { roundedFill, roundedFrame } from "./graphics.js";
import { mathEval, parseVarStr } from "./utils.js";

const propertiesDefaults: PropertiesDefaults = {
    "globalDefaults": { "borderFeatures": {}, "borderWidth": 0, "padding": 0 },
    "rootDefaults": { "background": "#06a", "color": "white", "borderRadius": 8, "font": "sans-serif", "lineHeight": 46, "lineSpacing": 4, "fillCorners": true, "xSpacing": 8 },
    "defaults": {
        ".": { "borderWidth": 4, "padding": 8 },
        "skylt": { "padding": 6, "blockDisplay": false, "passAnchor": false, "alignContentsV": "middle" },
        "vagnr": { "value": "123", "borderWidth": 3, "borderRadius": 7, "dashedInset": false, "padding": [14, 2] },
        "text": { "value": "Text" },
        "newline": {},
        "symbol": { "padding": 5, "type": "default", "grow": true }
    }
};

// Bestämning av värde på elementegenskaper görs enligt följande prioriteringsordning:
// 1. Specificerat värde
// 2. Värde från förälder (om egenskapen kan ärvas) eller från rootDefaults (endast rotelement)
// 3. Typspecifikt standardvärde (från defaults)
// 4. Globalt standardvärde (från globalDefaults)

function to4EForm(data: number[] | number): Vec4{
    if(!Array.isArray(data)) data = [ data, data ];
    if(data.length != 4) data = [ data[0], data[1], data[0], data[1] ];
    return [data[0], data[1], data[2], data[3]];
}

class BorderElement{
    env: MathEnv;
    w: number;
    h: number;

    constructor(feature: BorderFeatureDefinition, bw: number, brA: number, brB: number, sideLength: number){
        let w0 = feature.w,
            cvr = !!feature.cover;

        if(cvr) w0 = sideLength - bw;

        this.env = BorderElement.calculateEnv(feature, bw, brA, brB, w0);

        let h0 = mathEval(feature.h, this.env);

        this.env["h"] = h0;

        this.w = w0 + bw;
        this.h = h0 + bw;
    }

    static calculateEnv(feature: BorderFeatureDefinition, bw: number, brA: number, brB: number, w0: number): MathEnv{
        let env: MathEnv = {bra: brA, brb: brB, bw: bw, w: w0};

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

export abstract class SignRenderer<C, T extends NewDrawingArea<C>>{
    protected abstract createCanvas(w?: number, h?: number): T;
    protected abstract getText(url: string): Promise<string>;

    private borderSize(innerWidth: number, innerHeight: number, properties: SignElementProperties){
        let bs = new BorderDimensions(properties.borderWidth),
            bf = properties.borderFeatures;

        if(bf["left"] !== undefined)
            bs.set(0, new BorderElement(this.conf.borderFeatures[bf["left"]], properties.borderWidth[0], properties.borderRadius[0], properties.borderRadius[3], innerHeight + properties.borderWidth[1] + properties.borderWidth[3]));

        if(bf["right"] !== undefined)
            bs.set(2, new BorderElement(this.conf.borderFeatures[bf["right"]], properties.borderWidth[2], properties.borderRadius[2], properties.borderRadius[1], innerHeight + properties.borderWidth[1] + properties.borderWidth[3]));

        if(bf["top"] !== undefined)
            bs.set(1, new BorderElement(this.conf.borderFeatures[bf["top"]], properties.borderWidth[1], properties.borderRadius[1], properties.borderRadius[0], innerWidth + properties.borderWidth[0] + properties.borderWidth[2]));

        if(bf["bottom"] !== undefined)
            bs.set(3, new BorderElement(this.conf.borderFeatures[bf["bottom"]], properties.borderWidth[3], properties.borderRadius[3], properties.borderRadius[2], innerWidth + properties.borderWidth[0] + properties.borderWidth[2]));

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

    private renderBorderFeature(ctx: NewDrawingArea<any>, x0: number, y0: number, feature: BorderFeatureDefinition, side: string, bs: BorderDimensions, borderBoxInnerW: number, innerHeight: number, prop: SignElementProperties){
        let color = prop.color,
            background = prop.background;

        let lr = (side === "left" || side === "right");
        let bri = lr ? (side === "left" ? 0 : 2) : (side === "top" ? 1 : 3);

        let bw = prop.borderWidth[bri];
        let s = [bs.el[bri]?.w ?? 0, bs.h[bri]];

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
                if(path.f > 0 || prop.fillCorners) ctx.fill(p);
            }

            if(path.s !== undefined){
                ctx.strokeStyle = [color, background][Math.abs(path.s)-1];
                if(path.s > 0 || prop.fillCorners) ctx.stroke(p);
            }
        });
    }

    private drawVec(ctx: T, href: string, currentColor: string, components: string[], dx: number, dy: number, dw: number, dh: number, sx: number = 0, sy: number = 0, sw: number = dw, sh: number = dh): Promise<void>{
        return this.getText(href).then(rawJson => {
            let vecImgData = JSON.parse(rawJson) as JSONVec;
            let ctx2: T = this.createCanvas(dw, dh);

            let xf = (dw/sw) * vecImgData.width / vecImgData.vectorSize[0],
                yf = (dh/sh) * vecImgData.height / vecImgData.vectorSize[1];

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

    protected resolveTemplate(opt: SignElementOptions): SignElementOptions{
        while(opt.type.startsWith("#")){
            let templateName = opt.type.slice(1);
            let templ = this.conf.templates[templateName];
            if(!templ){
                alert("ERROR: Unknown template \"" + templateName + "\".")
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
            properties: Object.assign({}, propertiesDefaults, config.properties),
            signTypes: config.signTypes ?? {},
            symbols: config.symbols ?? {},
            borderFeatures: config.borderFeatures ?? {},
            templates: config.templates ?? {}
        };
    }

    private static getInhProperties(prop: SignElementProperties): SignElementBaseProperties{
        const { background, borderRadius, color, font, lineHeight, lineSpacing, xSpacing } = prop;
        return { background, borderRadius, color, font, lineHeight, lineSpacing, xSpacing };
    }

    private _render(opt: SignElementOptions, parentProperties: SignElementBaseProperties | null): RenderingResult<C, T>{
        let firstLastCenter: Vec4 = [NaN, NaN, NaN, NaN]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        opt = this.resolveTemplate(opt);

        let prop: SignElementProperties = Object.assign(
            {},
            this.conf.properties.globalDefaults,
            this.conf.properties.defaults[opt.type.startsWith(".") ? "." : opt.type],
            parentProperties === null ? this.conf.properties.rootDefaults : parentProperties,
            opt.properties
        );

        Object.assign(prop, {
            padding: to4EForm(prop.padding),
            borderRadius: to4EForm(prop.borderRadius),
            borderWidth: to4EForm(prop.borderWidth)
        });

        let padding = Array.from(prop.padding);

        let width = 0, height = 0, maxHeight = 0;
        let renderPromise: (ctx: T, x0: number, y0: number, maxInnerHeight: number) => Promise<void>
            = () => Promise.resolve();

        if(opt.type === "skylt"){
            let w = [0], h = [0], j = 0;

            let totalLineSpacing = 0;

            let ch = (opt.elements ?? []).map((c, i) => {
                let re = this._render(c, SignRenderer.getInhProperties(prop));
                let c2 = { isn: c.type === "newline", r: re, bs: re.bs, row: j, x: 0, p: c.properties };

                if(c2.isn || (i > 0 && prop.blockDisplay)){
                    c2.row = ++j;
                    w.push(0);
                    h.push(0);
                    totalLineSpacing += (prop.blockDisplay ? prop.lineSpacing : prop.lineSpacing);
                }

                if(!c2.isn){
                    if(w[j] > 0){
                        w[j] += prop.xSpacing;
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
                if(!c2.isn && !prop.blockDisplay){
                    c2.x += SignRenderer.calculateAlignmentOffset(prop.alignContents, w[c2.row], width);
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

            if(prop.passAnchor){
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
                if(c2.isn || (i > 0 && prop.blockDisplay)){
                    y += (prop.blockDisplay ? prop.lineSpacing : (c2.p?.lineSpacing ?? prop.lineSpacing));
                    y += h[c2.row - 1];
                }

                if(c2.isn) return;

                let dx = 0, iw = prop.blockDisplay ? (width - c2.bs[0] - c2.bs[2]) : c2.r.w;

                if(prop.blockDisplay){
                    dx += SignRenderer.calculateAlignmentOffset(c2.p?.alignContents, w[c2.row], iw + c2.bs[0] + c2.bs[2]);
                }

                return c2.r.doRender(
                    ctx,
                    x0 + padding[0] + c2.x, y0 + padding[1] + y,
                    dx,
                    h[c2.row] - c2.bs[1] - c2.bs[3],
                    prop.alignContentsV,
                    iw
                );
            })).then(() => {});
        }else if(opt.type === "vagnr" || opt.type === "text"){
            let ctx_temp = this.createCanvas();

            ctx_temp.font = "32px " + prop.font;

            width = Math.floor(ctx_temp.measureText(prop.value ?? "").width);
            height = prop.lineHeight;

            renderPromise = (ctx, x0, y0, _) => new Promise(res => {
                if(prop.dashedInset){
                    let bw = prop.borderWidth;

                    roundedFrame(
                        ctx,
                        x0 + 2*bw[0], y0 + 2*bw[1],
                        width + padding[0] + padding[2] - 2*bw[0] - 2*bw[2], height + padding[1] + padding[3] - 2*bw[1] - 2*bw[3],
                        bw,
                        prop.color,
                        prop.borderRadius,
                        [10, 10]
                    );
                }

                ctx.font = "32px " + prop.font;
                ctx.textBaseline = "middle";

                ctx.fillStyle = prop.color;
                ctx.fillText(prop.value ?? "", x0 + padding[0], y0 + firstLastCenter[1]);

                res();
            });
        }else if(opt.type === "symbol"){
            let symbolType = this.conf.symbols[prop.type ?? ""];

            width = symbolType.width;
            [height, maxHeight] = symbolType.height;

            let url = "res/symbol/" + (prop.type ?? "default") + ".json";
            let v: string | undefined = prop.variant ?? symbolType.default;

            renderPromise = (ctx, x0, y0, maxInnerHeight) => this.drawVec(
                ctx, url, prop.color, v === undefined ? [] : [v],
                x0 + padding[0], y0 + padding[1], // dx, dy
                width, maxInnerHeight - padding[1] - padding[3] // dw=sw, dh=sh
            );
        }else if(opt.type === "newline"){
            width = 0;
            height = 0;
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

                let result = this._render(s, SignRenderer.getInhProperties(prop));
                let bs = result.bs;

                let rse = [ result.w + bs[0] + bs[2], result.h + bs[1] + bs[3] ];

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
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[0];
                        break;
                    case "center-last":
                        leftX = Math.floor((lx[0] + lx[1]) / 2) - result.flc[2];
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

            width = boundingBox[1] - boundingBox[0];
            height = boundingBox[3] - boundingBox[2];

            renderPromise = (ctx, x0, y0, _) => Promise.all(r.map(res => {
                let x1 = res.x - boundingBox[0],
                    y1 = res.y - boundingBox[2];

                let dx = 0;

                return res.renderPromise.doRender(ctx, x0 + padding[0] + x1, y0 + padding[1] + y1, dx, res.renderPromise.h, prop.alignContentsV);
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
                    ctx, "res/" + opt.type.slice(1) + ".json", prop.color, keys,
                    x0 + prop.padding[0] - boundingBox[0] + crop[0], // dx
                    y0 + prop.padding[1] - boundingBox[2] + crop[1], // dy
                    crop[2], crop[3], // dw=sw, dh=sh
                    crop[0], crop[1] // sx, sy
                );
            });
        }else{
            alert("Fel!");
        }

        let bs = this.borderSize(width + padding[0] + padding[2], height + padding[1] + padding[3], prop);

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

                if(prop.grow && innerHeight < maxInnerHeight){
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
                    let bf = prop.borderFeatures[s];
                    return bf !== undefined && this.conf.borderFeatures[bf].cover; // cover => hel, täcker hela kantens längd
                });

                let br: Vec4 = [...prop.borderRadius],
                    bw: Vec4 = [...prop.borderWidth];

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
                    prop.background,
                    !!prop.fillCorners
                );

                await renderPromise(ctx, x0 + dx + bs.h[0], y0 + dy + bs.h[1], innerHeight);

                roundedFrame(
                    ctx,
                    x0 + bs.h[0], y0 + bs.h[1],
                    innerWidth, innerHeight,
                    bw,
                    prop.color,
                    br
                );

                Object.entries(prop.borderFeatures).forEach(feature => {
                    this.renderBorderFeature(ctx, x0, y0, this.conf.borderFeatures[feature[1]], feature[0], bs, innerWidth, innerHeight, prop);
                });
            }
        };
    }

    public async render(data: SignElementOptions): Promise<C>{
        let r = this._render(data, null);

        let bs = r.bs;
        let canv = this.createCanvas(r.w + bs[0] + bs[2], r.h + bs[1] + bs[3]);

        if(canv === null) throw new Error("Fel: Kunde inte hitta tvådimensionell renderingskontext.");

        await r.doRender(canv, 0, 0, 0, r.h);
        return canv.canv;
    }
}
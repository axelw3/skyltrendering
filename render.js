(function(){

// Priority:
// 1. Specified value
// 2. Value from parent (if property is inherited)
// 3. Default value (from DEFAULT_PROPERTIES)
// 4. DEFAULTS (if root)
// 5. Global defaults (GLOBAL_DEFAULTS)

const INHERITED = ["color", "background", "font", "borderRadius", "lineHeight", "lineSpacing"]; // properties that can be inherited

const GLOBAL_DEFAULTS = {
    "borderFeatures": {},
    "borderWidth": 0,
    "padding": 0
};

const DEFAULTS = { // defaults (applied only to the root tag)
    "background": "#06a",
    "color": "white",
    "borderRadius": 4,
    "font": "sans-serif",
    "lineHeight": 46,
    "fillCorners": true
};

const DEFAULT_PROPERTIES = {
    ".": {
        "borderWidth": 4,
        "padding": 8
    },
    "skylt": {
        "padding": 6,
        "lineSpacing": 4,
        "blockDisplay": false,
        "passAnchor": false,
        "alignContentsV": "middle",
        "alignContents": "left"
    },
    "vagnr": {
        "value": "000",
        "borderWidth": 3,
        "borderRadius": 4,
        "dashedInset": false,
        "padding": [14, 2]
    },
    "text": {
        "value": "Text"
    },
    "newline": {},
    "symbol": {
        "padding": 5,
        "type": "arrow-small",
        "grow": true
    }
};

const TEMPLATES = {
    "avfart": (no = "1") => ({
        "type": "skylt",
        "properties": {
            "padding": 0,
            "background": "#aaa",
            "color": "black"
        },
        "elements": [
            {
                "type": "skylt",
                "properties": {
                    "background": "#fd0",
                    "borderWidth": 4,
                    "borderRadius": 18,
                    "padding": [5, 0]
                },
                "elements": [
                    {
                        "type": "symbol",
                        "properties": { "type": "exit" }
                    },
                    {
                        "type": "text",
                        "properties": {
                            "value": no
                        }
                    }
                ]
            }
        ]
    }),
    "vagnr": (no = "000") => ({
        "type": "vagnr",
        "properties": {
            "value": no
        }
    })
};

const SKYLT_ELEMENT_SPACING_X = 8;

const SKYLTTYPER = {
    "junction": {
        "width": 120,
        "height": 240,

        // bestämmer del av texturen som MÅSTE ingå (denna yta utökas sedan så att åtminstone all önskade noder ryms, men maximalt [0, 1, 0, 1])
        "core": [.4, .6, .15, .36], // [leftX, rightX, topY, bottomY]

        "nodes": {
            "fwd": { "x": [.2, .8], "y": [0, 0], "ay": "bottom" },
            "right": { "x": [1, 1], "y": [.25, .25], "ax": "left" },
            "left": { "x": [0, 0], "y": [.25, .25], "ax": "right" }
        }
    },
    "roundabout": {
        "width": 240,
        "height": 480,
        "core": [.35, .75, .09, .35],
        "nodes": {
            "fwd": { "x": [.5, .5], "y": [.03, .03], "ay": "bottom" },
            "right": { "x": [.9, .9], "y": [.21, .21], "ax": "left" },
            "left": { "x": [.1, .1], "y": [.21, .21], "ax": "right" }
        }
    },
    "water": {
        "width": 209,
        "height": 19,
        "core": [0, 1, 0, 1],
        "nodes": {
            "name": { "x": [.5, .5], "y": [-.1, -.1], "ax": "center", "ay": "bottom" }
        }
    },
    "spanish": {
        "width": 160,
        "height": 240,
        "core": [0, 1, 0, 1],
        "nodes": {
            "fwd": { "x": [0, 1], "y": [0, 0], "ay": "bottom" },
            "left": { "x": [0, 0], "y": [.33, .33], "ax": "right" }
        }
    }
};

const SYMBOLER = {
    "arrow-small": {
        "width": 48,
        "height": [48, 192],
        "anchorY": 0,
        "default": "left"
    },
    "exit": {
        "width": 46,
        "height": [26, 26],
        "default": ""
    }
};

// Samtliga designer sparas i "nedre kant"-form, dvs.
// i en orientering motsvarande klammern i skylt
// F9 (samlingsmärke för vägvisning).
// 
// Värdena för size och anchor antar en hypotetisk
// linjebredd = 0. Vid rendering adderas den valda
// linjebredden/2 i alla 4 riktningar, samt till
// ankarkoordinaterna (anchor).
const BORDER_FEATURES = {
    "bracket": {
        "paths": [
            { "p": "M-100,0H0L22,27L44,0H100", "s": 1, "f": 2 } // konstanta värden OK eftersom ingen storleksanpassning görs
        ],
        "size": [44, 27],
        "cover": false // true om storleken skall anpassas (OBS! linjebredd påverkas ej) så att kantens längd täcks
    },
    "arrow": {
        "paths": [
            { "p": "M0,0V${h}H${w}V0z", "f": -2, "s": -2 },
            { "p": "M0,0L${w/2},${h*17/27}L${w},0z", "f": 2 },
            { "p": "M0,-100V0L${w/2},${h*17/27}L${w},0V-100V0L${w/2},${h*25/27}L0,0z", "s": 1, "f": 1 }
        ],
        "size": [0, "w*27/44"],
        "cover": true
    },
    "diag": {
        "vars": [
            ["R_1", "bw/2+bra"],
            ["R_2", "bw/2+brb"],
            ["k", "35/60"],
            ["x1", "1-(k/sqrt((k*k+1)))*R_1"],
            ["xr", "1-(k/sqrt((k*k+1)))*R_2"],
            ["a", "-2*R_2+w+xr-x1*k+sqrt((2*R_1-x1*x1))-sqrt((2*R_2-xr*xr))"],
            ["margin", "30"]
        ],
        "paths": [
            { "p": "M0,0V${-k*x1+sqrt((2*R_1-x1*x1))+margin}L${w},${-sqrt((k*k+1))-k+1*bw/2+h}V0z", "f": -2, "s": -2 },
            {
                "p": "M0,-100V${margin}A${R_1},${R_1},0,0,0,${x1},${sqrt((2*R_1-x1*x1))+margin}L${-2*R_2+w+xr},${a+sqrt((2*R_2-xr*xr))+margin}A${R_2},${R_2},0,0,0,${w},${a+margin}V-100z",
                "s": 1,
                "f": 2
            },
            {
                "p": "M${w/2-43},0m5,0l-5,7l65,38l-8,14l29,-7l-10,-27l-8,12l-64,-36z",
                "f": 1
            }
        ],
        "size": [0, "w-x1*k+sqrt((2*R_1-x1*x1))+(sqrt((k*k+1))+k-1*bw/2)+margin"],
        "cover": true
    }
};

function to4EForm(data){
    if(!Array.isArray(data)) data = [ data, data ];
    if(data.length != 4) data = [ data[0], data[1], data[0], data[1] ];
    return data;
}

class BorderElement{
    constructor(featureName, bw, brA, brB, sideLength){
        let w0 = BORDER_FEATURES[featureName].size[0],
            h0 = BORDER_FEATURES[featureName].size[1],
            cvr = !!BORDER_FEATURES[featureName].cover;

        if(cvr) w0 = sideLength - bw;

        this.env = BorderElement.calculateEnv(featureName, bw, brA, brB, w0);

        if(cvr) h0 = mathEval(h0, this.env);

        this.env["h"] = h0;

        this.w = w0 + bw;
        this.h = h0 + bw;
        this.n = featureName;
    }

    static calculateEnv(featureName, bw, brA, brB, w0){
        let env = {bra: brA, brb: brB, bw: bw, w: w0};

        let feature = BORDER_FEATURES[featureName];
        if(!Array.isArray(feature.vars)) return env;

        for(let i = 0; i < feature.vars.length; i++){
            env[feature.vars[i][0]] = mathEval(feature.vars[i][1], env);
        }

        return env;
    }
}

class BorderDimensions{
    constructor(heights){
        this.h = [0, 0, 0, 0].map((_, i) => heights[i]);
        this.el = [null, null, null, null];
    }

    set(i, el){
        this.el[i] = el;
        this.h[i] = Math.floor(el.h);
    }
}

class SignElement{
    static borderSize(innerWidth, innerHeight, properties){
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

    static drawWithBorder(ctx, x0, y0, innerContents, properties, dx, dy, borderBoxInnerW, bs){
        // tag bort rundade hörn på sidor med hela kantutsmyckningar
        let bfs = ["left", "top", "right", "bottom"].map(s => {
            let bf = properties.borderFeatures[s];
            return bf !== undefined && BORDER_FEATURES[bf].cover; // cover => hel, täcker hela kantens längd
        });

        let br = Array.from(properties.borderRadius);

        for(let i = 0; i < 4; i++){
            if(bfs[i] || bfs[(i + 1) % 4]) br[i] = 0;
        }

        roundedFill(
            ctx,
            x0 + bs.h[0], y0 + bs.h[1],
            borderBoxInnerW, innerContents.height,
            properties.borderWidth.map((x, i) => bfs[i] ? 0 : x),
            br,
            properties.background,
            !!properties.fillCorners
        );

        ctx.drawImage(
            innerContents,
            x0 + dx + bs.h[0],
            y0 + dy + bs.h[1]
        );

        roundedFrame(
            ctx,
            x0 + bs.h[0], y0 + bs.h[1],
            borderBoxInnerW, innerContents.height,
            properties.borderWidth.map((x, i) => bfs[i] ? 0 : x),
            properties.color,
            br
        );

        Object.entries(properties.borderFeatures).forEach(feature => {
            let borderFeatureRendered = this.renderBorderFeature(feature[1], feature[0], properties, bs);
            let bfp = [x0, y0];

            switch(feature[0]){
                case "bottom":
                    bfp[1] += innerContents.height + bs.h[1];
                case "top":
                    bfp[0] += bs.h[0] + Math.floor((borderBoxInnerW - borderFeatureRendered.width) / 2);
                    break;
                case "right":
                    bfp[0] += borderBoxInnerW + bs.h[0];
                default:
                    bfp[1] += bs.h[1] + Math.floor((innerContents.height - borderFeatureRendered.height) / 2);
                    break;
            }

            ctx.drawImage(borderFeatureRendered, bfp[0], bfp[1]);
        });
    }

    static calculateAlignmentOffset(alignMode, innerWidth, outerWidth){
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

    static renderBorderFeature(featureName, side, properties, bs){
        let color = properties.color,
            background = properties.background;

        let lr = (side === "left" || side === "right");
        let bri = lr ? (side === "left" ? 0 : 2) : (side === "top" ? 1 : 3);

        let bw = properties.borderWidth[bri];
        let s = [bs.el[bri].w, bs.el[bri].h];

        let feature = BORDER_FEATURES[featureName];

        let canv = document.createElement("canvas");
        canv.width  = lr ? s[1] : s[0];
        canv.height = lr ? s[0] : s[1];

        // left:    cos 0   sin -1
        // top:     cos -1  sin 0
        // right:   cos 0   sin 1
        // bottom:  cos 1   sin 0

        let sr = lr ? (side === "left" ? 1 : (-1)) : 0, cr = lr ? 0 : (side === "top" ? (-1) : 1);
        let [a, b] = [(s[0] - bw) / 2, (s[1] - bw) / 2];

        let ctx = canv.getContext("2d");

        let tm = new DOMMatrix().translateSelf(canv.width / 2, canv.height / 2).multiplySelf(new DOMMatrix([
            cr, sr, -sr, cr, -a*cr + b*sr, -a*sr - b*cr
        ]));

        //ctx.fillStyle="#000";
        //ctx.fillRect(0, 0, canv.width, canv.height);

        ctx.transform(tm.a, tm.b, tm.c, tm.d, tm.e, tm.f);

        ctx.fillStyle = background;
        ctx.fillRect(0, -bw/2, s[0], bw);

        ctx.lineWidth = bw;
        ctx.lineCap = "square";

        feature.paths.forEach(path => {
            let p = new Path2D(parseVarStr(path.p, bs.el[bri].env));

            if(path.f !== undefined){
                ctx.fillStyle = [color, background][Math.abs(path.f)-1];
                if(path.f > 0 || properties.fillCorners) ctx.fill(p);
            }

            if(path.s !== undefined){
                ctx.strokeStyle = [color, background][Math.abs(path.s)-1];
                if(path.s > 0 || properties.fillCorners) ctx.stroke(p);
            }
        });

        return canv;
    }

    constructor(data, parentProperties){
        while(data.type.startsWith("#")){
            let templateName = data.type.slice(1);
            if(!TEMPLATES[templateName]){
                alert("ERROR: Unknown template \"" + templateName + "\".")
                break;
            }

            let template = TEMPLATES[templateName](...(data.params || []));
            Object.assign(template.properties, data.properties);
            data = template;
        }

        this.type = data.type;

        let prop = data.properties || {};

        this.properties = Object.assign({}, GLOBAL_DEFAULTS);

        if(parentProperties === null){
            Object.assign(this.properties, DEFAULTS);
        }else{
            INHERITED.forEach(key => {
                if(prop[key] !== undefined || parentProperties[key] === undefined) return;
                prop[key] = parentProperties[key];
            });
        }

        Object.assign(this.properties, DEFAULT_PROPERTIES[data.type.startsWith(".") ? "." : data.type], prop);

        this.children = (data.elements || []).map(element => new SignElement(element, this.properties));

        this.nodes = (data.nodes || {});
        Object.keys(this.nodes).forEach(key => this.nodes[key].signelement = new SignElement(this.nodes[key].data, this.properties));

        this.properties.padding = to4EForm(this.properties.padding);
        this.properties.borderRadius = to4EForm(this.properties.borderRadius);
        this.properties.borderWidth = to4EForm(this.properties.borderWidth);
    }

    render(){
        let canv = document.createElement("canvas");
        let ctx = canv.getContext("2d");

        let firstLastCenter = null; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        let padding = Array.from(this.properties.padding);

        let width = 0, height = 0;
        let renderPromise = _ => Promise.resolve(canv);

        if(this.type == "skylt"){
            let w = [0], h = [0], j = 0;

            let totalLineSpacing = 0;

            let ch = this.children.map((c, i) => {
                let c2 = { isn: c.type == "newline" };

                if(c2.isn || (i > 0 && this.properties.blockDisplay)){
                    j++;
                    w.push(0);
                    h.push(0);
                    totalLineSpacing += (this.properties.blockDisplay ? this.properties.lineSpacing : c.properties.lineSpacing);
                }

                c2.r = c.render();
                c2.row = j;
                c2.bs = c2.r.bs;

                if(!c2.isn){
                    if(w[j] > 0){
                        w[j] += SKYLT_ELEMENT_SPACING_X;
                    }

                    c2.x = w[j];
                    w[j] += c2.r.w + c2.bs[0] + c2.bs[2];

                    let h0 = c2.r.h + c2.bs[1] + c2.bs[3];
                    if(h0 > h[j]) h[j] = h0;
                }

                return c2;
            });

            canv.width = (width = Math.max(...w)) + padding[0] + padding[2];
            canv.height = (height = h.reduce((a, b) => a + b, totalLineSpacing)) + padding[1] + padding[3];

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
                canv.height - padding[3]
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

            renderPromise = _ => Promise.all(ch.map((c2, i) => {
                if(c2.isn || (i > 0 && this.properties.blockDisplay)){
                    y += this.children[i].properties.lineSpacing;
                    y += h[c2.row - 1];
                }

                if(c2.isn) return;

                let dx = 0, iw = this.properties.blockDisplay ? (width - c2.bs[0] - c2.bs[2]) : c2.r.w;

                if(this.properties.blockDisplay){
                    dx += SignElement.calculateAlignmentOffset(this.children[i].properties.alignContents, w[c2.row], iw + c2.bs[0] + c2.bs[2]);
                }

                return c2.r.doRender(
                    ctx,
                    padding[0] + c2.x, padding[1] + y,
                    dx,
                    this.children[i].properties,
                    this.properties,
                    h[c2.row] - c2.bs[1] - c2.bs[3],
                    iw
                );
            })).then(() => canv);
        }else if(this.type == "vagnr" || this.type == "text"){
            ctx.font = "32px " + this.properties.font;

            let box = ctx.measureText(this.properties.value);

            canv.width = (width = Math.floor(box.width)) + padding[0] + padding[2];
            canv.height = (height = this.properties.lineHeight) + padding[1] + padding[3];

            renderPromise = _ => new Promise(res => {
                if(this.properties.dashedInset){
                    let bw = this.properties.borderWidth;

                    roundedFrame(
                        ctx,
                        2*bw[0], 2*bw[1],
                        canv.width - 2*bw[0] - 2*bw[2], canv.height - 2*bw[1] - 2*bw[3],
                        bw,
                        this.properties.color,
                        this.properties.borderRadius,
                        [10, 10]
                    );
                }

                ctx.font = "32px " + this.properties.font;
                ctx.textBaseline = "middle";
                ctx.textAlign = "left";

                ctx.fillStyle = this.properties.color;
                ctx.fillText(this.properties.value, padding[0], firstLastCenter[1]);

                res(canv);
            });
        }else if(this.type == "symbol"){
            let symbolType = SYMBOLER[this.properties.type];
            let img = document.createElement("img");

            width = img.width = symbolType.width;
            [ height, img.height ] = symbolType.height;

            canv.width = width + padding[0] + padding[2];
            canv.height = height + padding[1] + padding[3];

            renderPromise = maxInnerHeight => new Promise((res, rej) => {
                img.addEventListener("load", () => {
                    if(this.properties.grow && canv.height < maxInnerHeight){
                        canv.height = Math.min(maxInnerHeight, padding[1] + padding[3] + symbolType.height[1]);
                    }

                    ctx.drawImage(
                        img,
                        0, 0,
                        img.width, canv.height - padding[1] - padding[3],
                        padding[0], padding[1],
                        img.width, canv.height - padding[1] - padding[3]
                    );
                    res(canv);
                });
                img.addEventListener("error", rej);

                let url = "svg/symbol/" + window.encodeURIComponent(this.properties.type) + ".svg"
                    + "#" + window.encodeURIComponent(this.properties.variant || symbolType.default);

                img.src = url;
            });
        }else if(this.type == "newline"){
            width = 0;
            height = 0;
        }else if(this.type.startsWith(".")){
            let t = SKYLTTYPER[this.type.slice(1)];
            let keys = Object.keys(t.nodes).sort().filter(nodeName => !!this.nodes[nodeName]);

            let svg = document.createElement("img");
            svg.width = t.width;
            svg.height = t.height;

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
            ];

            // fonts and svg loaded successfully
            let r = keys.map(nodeName => {
                let n = this.nodes[nodeName];
                let s = n.signelement;

                let tn = t.nodes[nodeName];

                n.anchor = Object.assign({ "x": tn.ax, "y": tn.ay }, n.anchor);

                let result = s.render();
                let bs = result.bs;

                let rse = [ result.w + bs[0] + bs[2], result.h + bs[1] + bs[3] ];

                let leftX = tn.x.map(x => x * t.width).map(Math.floor), topY = tn.y.map(y => y * t.height).map(Math.floor);

                switch(n.anchor.x){
                    case "right":
                        leftX = leftX[1] - rse[0];
                        break;
                    case "center":
                        leftX = Math.floor((leftX[0] + leftX[1]) / 2 - Math.floor(rse[0] / 2));
                        break;
                    case "center-first":
                        leftX = Math.floor((leftX[0] + leftX[1]) / 2) - result.flc[0];
                        break;
                    case "center-last":
                        leftX = Math.floor((leftX[0] + leftX[1]) / 2) - result.flc[2];
                        break;
                    default:
                        leftX = leftX[0];
                }

                switch(n.anchor.y){
                    case "bottom":
                        topY = topY[1] - rse[1];
                        break;
                    case "middle":
                        topY = Math.floor((topY[0] + topY[1]) / 2) - Math.floor(rse[1] / 2);
                        break;
                    case "middle-first":
                        topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[1] - bs[1];
                        break;
                    case "middle-last":
                        topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[3] - bs[1];
                        break;
                    default:
                        topY = topY[0];
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

            canv.width = (boundingBox[1] - boundingBox[0]) + padding[0] + padding[2];
            canv.height = (boundingBox[3] - boundingBox[2]) + padding[1] + padding[3];

            renderPromise = _ => Promise.all(r.map(res => {
                let x0 = res.x - boundingBox[0],
                    y0 = res.y - boundingBox[2];

                let dx = 0;

                return res.renderPromise.doRender(ctx, padding[0] + x0, padding[1] + y0, dx, res.p, this.properties, res.renderPromise.h);
            })).then(() => {
                if(t.width == 0 || t.height == 0) return canv;

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

                return new Promise((resolve, reject) => {
                    svg.onload = resolve;
                    svg.onerror = reject;
                    svg.src = "svg/" + this.type.slice(1) + ".svg#" + keys.join("_");
                }).then(() => {
                    let svgRasterized = document.createElement("canvas");
                    Object.assign(svgRasterized, { width: t.width, height: t.height });
                    svgRasterized.getContext("2d").drawImage(svg, 0, 0, t.width, t.height);

                    ctx.drawImage(
                        svgRasterized,
                        crop[0], crop[1], // sx, sy
                        crop[2], crop[3], // sw, sh
                        this.properties.padding[0] - boundingBox[0] + crop[0], // dx
                        this.properties.padding[1] - boundingBox[2] + crop[1], // dy
                        crop[2], crop[3] // dw, dh
                    );

                    return canv;
                });
            });
        }else{
            alert("Fel!");
        }

        let bs = SignElement.borderSize(width + padding[0] + padding[2], height + padding[1] + padding[3], this.properties);

        if(firstLastCenter === null){
            firstLastCenter = [
                Math.floor(canv.width / 2),
                Math.floor(canv.height / 2)
            ];
            firstLastCenter.push(...firstLastCenter);
        }

        return {
            flc: firstLastCenter,
            w: width + padding[0] + padding[2],
            h: height + padding[1] + padding[3],
            bs: bs.h,
            doRender: async (ctx, x1, y1, dx, prop, parentProperties = {}, maxInnerHeight, iw = 0) => {
                const rendered = await renderPromise(maxInnerHeight);

                let offsetTop = 0;
                switch (parentProperties.alignContentsV) {
                    case "middle":
                        offsetTop = Math.floor((maxInnerHeight - rendered.height) / 2);
                        break;
                    case "bottom":
                        offsetTop = maxInnerHeight - rendered.height;
                        break;
                }

                SignElement.drawWithBorder(
                    ctx,
                    x1, y1 + offsetTop,
                    rendered,
                    prop,
                    dx, 0,
                    iw === 0 ? rendered.width : iw,
                    bs
                );
            }
        };
    }
}

const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");

const tratex = new FontFace(
    "Tratex",
    "url(TratexSvart-Regular.otf)",
);

const tratexVersal = new FontFace(
    "TratexVersal",
    "url(TRATEXPOSVERSAL-POSVERSAL.otf)",
);

document.fonts.add(tratex);
document.fonts.add(tratexVersal);

Promise.all([tratex.load(), tratexVersal.load()]).then(() => {
    let url = new URL(window.location.href);
    if(!url.searchParams.has("data")) return;

    let data = JSON.parse(url.searchParams.get("data"));

    let sign = new SignElement(data, null);
    let r = sign.render();

    let bs = r.bs;
    Object.assign(canvas, { width: r.w + bs[0] + bs[2], height: r.h + bs[1] + bs[3] });

    r.doRender(ctx, 0, 0, 0, sign.properties, {}, r.h);
});

})();
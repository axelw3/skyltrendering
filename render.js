// Priority:
// 1. Specified value
// 2. Value from parent (if property is inherited)
// 3. Default value (from DEFAULT_PROPERTIES or DEFAULTS)
// 4. Global defaults (GLOBAL_DEFAULTS)

const INHERITED = ["color", "background", "font", "borderRadius", "lineHeight", "lineSpacing"]; // properties that can be inherited

const GLOBAL_DEFAULTS = {
    "borderFeatures": {},
    "borderWidth": 0,
    "padding": 0
};

const DEFAULTS = { // defaults (applied only to the root tag)
    "background": "navy",
    "color": "white",
    "borderWidth": 4,
    "borderRadius": 4,
    "font": "sans-serif",
    "padding": 8,
    "lineHeight": 46,
    "fillCorners": true
};

const DEFAULT_PROPERTIES = {
    "skylt": {
        "padding": [6, 5],
        "lineSpacing": 4,
        "blockDisplay": false,
        "anchorForwarded": false,
        "fillCorners": false
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
            "background": "#ffd908",
            "borderWidth": 4,
            "borderRadius": 18,
            "padding": [4, 0]
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
    })
};

const SKYLT_ELEMENT_SPACING_X = 8;

const SKYLTTYPER = {
    "plain": {
        "width": 0,
        "height": 0,
        "core": [0, 0, 0, 0],
        "nodes": {
            "default": { "x": [0, 0], "y": [0, 0] }
        }
    },
    "junction": {
        "width": 120,
        "height": 240,

        // bestämmer del av texturen som MÅSTE ingå (denna yta utökas sedan så att åtminstone all önskade noder ryms, men maximalt [0, 1, 0, 1])
        "core": [.4, .6, .15, .36], // [leftX, rightX, topY, bottomY]

        "nodes": {
            "fwd": { "x": [.2, .8], "y": [0, 0]},
            "right": { "x": [1, 1], "y": [.25, .25] },
            "left": { "x": [0, 0], "y": [.25, .25] }
        }
    },
    "roundabout": {
        "width": 240,
        "height": 480,
        "core": [.35, .75, .09, .35],
        "nodes": {
            "fwd": { "x": [.5, .5], "y": [.03, .03] },
            "right": { "x": [.9, .9], "y": [.21, .21] },
            "left": { "x": [.1, .1], "y": [.21, .21] }
        }
    },
    "water": {
        "width": 209,
        "height": 19,
        "core": [0, 1, 0, 1],
        "nodes": {
            "name": { "x": [.5, .5], "y": [-.1, -.1] }
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

// Samtliga designer sparas i nedre kant-form, dvs.
// i en orientering motsvarande klammern i skylt
// F9 (samlingsmärke för vägvisning).
// 
// Värdena för size och anchor antar en hypotetisk
// linjebredd = 0. Vid rendering adderas den valda
// linjebredden/2 i alla 4 riktningar, samt till
// ankarkoordinaterna (anchor).
const BORDER_FEATURES = {
    "bracket": {
        "path": new Path2D("M-1,0h1l22,27l22-27h1"),
        "size": [44, 27],
        "fixedSize": true // false om omskalning skall göras (OBS! den resulterande linjebredden påverkas ej) så att kantens längd täcks
    },
    "arrow": {
        "path": new Path2D("M0,-100v100l22,17l22-17v-100v100l-22,25l-22-25z"),
        "fill": new Path2D("M0,0l22,17l22-17z"),
        "fillPathMode": true,
        "size": [44, 27],
        "fixedSize": false
    }
};

function to4EForm(data){
    if(!Array.isArray(data)) data = [ data, data ];
    if(data.length != 4) data = [ data[0], data[1], data[0], data[1] ];
    return data;
}

class SignElement{
    static borderSize(innerWidth, innerHeight, properties){
        let bs = Array.from(properties.borderWidth);

        if(properties.borderFeatures["left"] !== undefined)
            bs[0] = SignElement.borderFeatureSize(properties.borderFeatures["left"], properties.borderWidth[0], innerHeight + properties.borderWidth[1] + properties.borderWidth[3])[1];

        if(properties.borderFeatures["right"] !== undefined)
            bs[2] = SignElement.borderFeatureSize(properties.borderFeatures["right"], properties.borderWidth[2], innerHeight + properties.borderWidth[1] + properties.borderWidth[3])[1];

        if(properties.borderFeatures["top"] !== undefined)
            bs[1] = SignElement.borderFeatureSize(properties.borderFeatures["top"], properties.borderWidth[1], innerWidth + properties.borderWidth[0] + properties.borderWidth[2])[1];

        if(properties.borderFeatures["bottom"] !== undefined)
            bs[3] = SignElement.borderFeatureSize(properties.borderFeatures["bottom"], properties.borderWidth[3], innerWidth + properties.borderWidth[0] + properties.borderWidth[2])[1];

        return bs;
    }

    static drawWithBorder(ctx, x0, y0, innerContents, properties, dx, dy, borderBoxInnerW){
        let bs = SignElement.borderSize(innerContents.width, innerContents.height, properties);

        roundedFill(
            ctx,
            x0 + bs[0] - properties.borderWidth[0], y0 + bs[1] - properties.borderWidth[1],
            borderBoxInnerW + properties.borderWidth[0] + properties.borderWidth[2], innerContents.height + properties.borderWidth[1] + properties.borderWidth[3],
            properties.borderWidth,
            properties.borderRadius,
            properties.background,
            !!properties.fillCorners
        );

        ctx.drawImage(
            innerContents,
            x0 + dx + bs[0],
            y0 + dy + bs[1]
        );

        roundedFrame(
            ctx,
            x0 + bs[0] - properties.borderWidth[0], y0 + bs[1] - properties.borderWidth[1],
            borderBoxInnerW + properties.borderWidth[0] + properties.borderWidth[2], innerContents.height + properties.borderWidth[1] + properties.borderWidth[3],
            properties.borderWidth,
            properties.color,
            properties.borderRadius
        );

        Object.entries(properties.borderFeatures).forEach(feature => {
            let borderFeatureRendered = this.renderBorderFeature(feature[1], feature[0], properties.borderWidth, borderBoxInnerW + properties.borderWidth[0] + properties.borderWidth[2], innerContents.height + properties.borderWidth[1] + properties.borderWidth[3], properties.color, properties.background);
            let bfp = [x0, y0];

            if(feature[0] === "bottom" || feature[0] === "top") bfp[0] += bs[0] + Math.floor((borderBoxInnerW - borderFeatureRendered.width) / 2);
            else bfp[1] += bs[1] + Math.floor((innerContents.height - borderFeatureRendered.height) / 2);

            switch(feature[0]){
                case "bottom":
                    bfp[1] += innerContents.height + bs[1];
                    break;
                case "right":
                    bfp[0] += borderBoxInnerW + bs[0];
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

    static borderFeatureSize(featureName, bw, sideLength){
        let w = BORDER_FEATURES[featureName].size[0],
            h = BORDER_FEATURES[featureName].size[1];

        let sf = 1;

        if(!BORDER_FEATURES[featureName].fixedSize){
            sf = (sideLength - bw) / w;
            h = Math.floor(h * sf);
            w = sideLength - bw;
        }

        return [w + bw, h + bw, sf];
    }

    static renderBorderFeature(featureName, side, borderWidth, outerWidth, outerHeight, color, background){
        let lr = (side === "left" || side === "right");

        let bw = borderWidth[lr ? (side === "left" ? 0 : 2) : (side === "top" ? 1 : 3)];

        let sideLength = lr ? outerHeight : outerWidth;
        let s = SignElement.borderFeatureSize(featureName, bw, sideLength);

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

        const sm = new DOMMatrix([s[2], 0, 0, s[2], 0, 0]);

        //ctx.fillStyle="#000";
        //ctx.fillRect(0, 0, canv.width, canv.height);

        ctx.transform(tm.a, tm.b, tm.c, tm.d, tm.e, tm.f);

        ctx.fillStyle = background;
        ctx.fillRect(0, -bw/2, s[0], bw);

        ctx.lineWidth = bw;
        ctx.lineCap = "square";

        let path = new Path2D();
        path.addPath(feature.path, sm);

        if(feature.fill !== undefined){
            let path2 = new Path2D();
            path2.addPath(feature.fill, sm);
            ctx.fill(path2);

            if(!!feature.fillPathMode){
                ctx.fillStyle = color;
                ctx.fill(path);
            }
        }else{
            ctx.fill(path);
        }

        ctx.strokeStyle = color;
        ctx.stroke(path);

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

        INHERITED.forEach(key => {
            if(prop[key] !== undefined || parentProperties[key] === undefined) return;
            prop[key] = parentProperties[key];
        });

        this.properties = Object.assign({}, GLOBAL_DEFAULTS, DEFAULT_PROPERTIES[data.type], prop);
        this.children = (data.elements || []).map(element => new SignElement(element, this.properties));

        this.properties.padding = to4EForm(this.properties.padding);
        this.properties.borderRadius = to4EForm(this.properties.borderRadius);
        this.properties.borderWidth = to4EForm(this.properties.borderWidth);

        // tag bort rundade hörn på sidor med hela kantutsmyckningar
        let bfs = ["left", "top", "right", "bottom"].map(s => {
            let bf = this.properties.borderFeatures[s];
            return bf !== undefined && !BORDER_FEATURES[bf].fixedSize; // !fixedSize => hel, täcker hela kantens längd
        });

        for(let i = 0; i < 4; i++){
            if(bfs[i] || bfs[(i + 1) % 4]) this.properties.borderRadius[i] = 0;
        }
    }

    render(){
        let canv = document.createElement("canvas");
        let ctx = canv.getContext("2d");

        let firstLastCenter = [0, 0, 0, 0]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

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
                c2.bs = SignElement.borderSize(c2.r.w, c2.r.h, c.properties);

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
            firstLastCenter[0] = padding[0] + ch[0].x + ch[0].bs[0];
            firstLastCenter[2] = padding[0] + ch[ch.length - 1].x + ch[ch.length - 1].bs[0];

            // mitt-y (rad), se även if-sats nedan
            firstLastCenter[1] = padding[1];
            firstLastCenter[3] = canv.height - padding[3];

            if(this.properties.anchorForwarded){
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

                const y1 = y;
                return c2.r.doRender(h[c2.row] - c2.bs[1] - c2.bs[3]).then(d => {
                    let dx = 0, iw = this.properties.blockDisplay ? (width - c2.bs[0] - c2.bs[2]) : c2.r.w;

                    if(this.properties.blockDisplay){
                        dx += SignElement.calculateAlignmentOffset(this.children[i].properties.alignContents, w[c2.row], iw + c2.bs[0] + c2.bs[2]);
                    }

                    SignElement.drawWithBorder(
                        ctx,
                        padding[0] + c2.x,
                        padding[1] + y1 + Math.floor((h[c2.row] - (d.height + c2.bs[1] + c2.bs[3])) / 2),
                        d,
                        this.children[i].properties,
                        dx, 0,
                        iw
                    );
                });
            })).then(() => canv);
        }else if(this.type == "vagnr" || this.type == "text"){
            ctx.font = "32px " + this.properties.font;

            let box = ctx.measureText(this.properties.value);

            canv.width = (width = Math.floor(box.width)) + padding[0] + padding[2];
            canv.height = (height = this.properties.lineHeight) + padding[1] + padding[3];

            firstLastCenter[0] = Math.floor(canv.width / 2);
            firstLastCenter[1] = Math.floor(canv.height / 2);
            firstLastCenter[2] = firstLastCenter[0];
            firstLastCenter[3] = firstLastCenter[1];

            renderPromise = _ => new Promise(res => {
                if(this.properties.dashedInset){
                    let bw = this.properties.borderWidth;

                    roundedFrame(
                        ctx,
                        bw[0], bw[1],
                        canv.width - bw[0] - bw[2], canv.height - bw[1] - bw[3],
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

            renderPromise = (maxInnerHeight = canv.height) => new Promise((res, rej) => {
                img.addEventListener("load", () => {
                    if(this.properties.grow && canv.height < maxInnerHeight){
                        canv.height = Math.min(maxInnerHeight, padding[1] + padding[3] + symbolType.height[1]);
                    }

                    //ctx.fillStyle = "#f00";
                    //ctx.fillRect(0, 0, canv.width, canv.height);
                    //ctx.fillStyle = "#00f";
                    //ctx.fillRect(padding[0], padding[1], img.width, canv.height - padding[1] - padding[3]);

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
        }else{
            alert("Fel!");
        }

        return { flc: firstLastCenter, w: width + padding[0] + padding[2], h: height + padding[1] + padding[3], doRender: renderPromise };
    }
}

(function(){
    let url = new URL(window.location.href);
    if(!url.searchParams.has("data")) return;

    let data = JSON.parse(url.searchParams.get("data"));

    const canvas = document.getElementsByTagName("canvas")[0];

    // load the "Bitter" font from Google Fonts
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

    const ctx = canvas.getContext("2d");
    let t = SKYLTTYPER[data.type];
    let keys = Object.keys(t.nodes).sort().filter(nodeName => !!data.nodes[nodeName]);
    let prop = Object.assign({}, GLOBAL_DEFAULTS, DEFAULTS, data.properties);

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

    Promise.all([new Promise((resolve, reject) => {
        svg.src = "svg/" + data.type + ".svg#" + keys.join("_");
        svg.onload = resolve;
        svg.onerror = reject;
    }), tratex.load(), tratexVersal.load()]).then(() => {
        let svgRasterized = document.createElement("canvas");
        Object.assign(svgRasterized, { width: t.width, height: t.height });
        svgRasterized.getContext("2d").drawImage(svg, 0, 0, t.width, t.height);

        // fonts and svg loaded successfully
        let rendered = keys.map(nodeName => {
            let n = data.nodes[nodeName];
            let s = new SignElement(n.data, prop);

            if(n.anchor === undefined) n.anchor = { "x": "left", "y": "top" };

            let result = s.render();
            let bs = SignElement.borderSize(result.w, result.h, s.properties);

            let rse = [ result.w + bs[0] + bs[2], result.h + bs[1] + bs[3] ];

            let leftX = t.nodes[nodeName].x.map(x => x * t.width).map(Math.floor), topY = t.nodes[nodeName].y.map(y => y * t.height).map(Math.floor);

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

            return { renderPromise: result.doRender(), x: leftX, y: topY, p: s.properties };
        });

        canvas.width = 2 * prop.borderWidth + (boundingBox[1] - boundingBox[0]) + 2 * prop.padding;
        canvas.height = 2 * prop.borderWidth + (boundingBox[3] - boundingBox[2]) + 2 * prop.padding;

        ctx.fillStyle = prop.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        roundedFrame(ctx, 0, 0, canvas.width, canvas.height, [ prop.borderWidth, prop.borderWidth, prop.borderWidth, prop.borderWidth ], prop.color, [prop.borderRadius, prop.borderRadius, prop.borderRadius, prop.borderRadius]);

        rendered.forEach(res => {
            let x0 = prop.padding + prop.borderWidth + res.x - boundingBox[0],
                y0 = prop.padding + prop.borderWidth + res.y - boundingBox[2];

            res.renderPromise.then(rendered => {
                SignElement.drawWithBorder(
                    ctx,
                    x0, y0,
                    rendered,
                    res.p,
                    0, 0,
                    rendered.width
                );
            });
        });

        if(t.width == 0 || t.height == 0) return;

        svgBox[0] = Math.min(1, Math.max(0, boundingBox[0] / t.width));
        svgBox[1] = Math.max(0, Math.min(1, boundingBox[1] / t.width));
        svgBox[2] = Math.min(1, Math.max(0, boundingBox[2] / t.height));
        svgBox[3] = Math.max(0, Math.min(1, boundingBox[3] / t.height));

        /*ctx.fillStyle = "black";
        ctx.fillRect(
            prop.padding + prop.borderWidth - boundingBox[0] + svgBox[0] * t.width,
            prop.padding + prop.borderWidth - boundingBox[2] + svgBox[2] * t.height,
            (svgBox[1] - svgBox[0]) * t.width,
            (svgBox[3] - svgBox[2]) * t.height
        );*/

        let crop = [
            svgBox[0] * t.width,
            svgBox[2] * t.height,
            (svgBox[1] - svgBox[0]) * t.width,
            (svgBox[3] - svgBox[2]) * t.height
        ]; // [x0, y0, w, h]

        ctx.drawImage(
            svgRasterized,
            crop[0], crop[1], // sx, sy
            crop[2], crop[3], // sw, sh
            prop.padding + prop.borderWidth - boundingBox[0] + crop[0], // dx
            prop.padding + prop.borderWidth - boundingBox[2] + crop[1], // dy
            crop[2], crop[3] // dw, dh
        );
    }, (err) => {
        console.error(err);
    },
    );
})();
// Priority:
// 1. Specified value
// 2. Value from parent (if property is inherited)
// 3. Default value (from DEFAULT_PROPERTIES or DEFAULTS)
// 4. Global defaults (GLOBAL_DEFAULTS)

const INHERITED = ["color", "background", "font", "borderRadius", "lineHeight", "lineSpacing"]; // properties that can be inherited

const GLOBAL_DEFAULTS = {
    "borderFeatures": [],
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
        "padding": 5,
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
        "padding": 6,
        "type": "arrow-small"
    }
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
        "height": 48,
        "default": "left"
    }
};

class SignElement{
    static drawWithBorder(ctx, x0, y0, innerContents, properties, dx, dy, borderBoxW){
        roundedRect(
            ctx,
            x0, y0,
            borderBoxW, innerContents.height + 2 * properties.borderWidth,
            properties.borderWidth,
            properties.color,
            properties.borderRadius,
            !!properties.fillCorners,
            properties.background
        );

        ctx.drawImage(
            innerContents,
            x0 + dx + properties.borderWidth,
            y0 + dy + properties.borderWidth
        );
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

    constructor(data, parentProperties){
        this.type = data.type;

        let prop = data.properties || {};

        INHERITED.forEach(key => {
            if(prop[key] !== undefined || parentProperties[key] === undefined) return;
            prop[key] = parentProperties[key];
        });

        this.properties = Object.assign({}, GLOBAL_DEFAULTS, DEFAULT_PROPERTIES[data.type], prop);
        this.children = (data.elements || []).map(element => new SignElement(element, this.properties));

        if(!Array.isArray(this.properties.padding)) this.properties.padding = [
            this.properties.padding,
            this.properties.padding
        ];

        if(this.properties.padding.length != 4) this.properties.padding = [
            this.properties.padding[0], // vänster
            this.properties.padding[1], // ovanför
            this.properties.padding[0], // höger
            this.properties.padding[1]  // nedanför
        ];
    }

    render(){
        let canv = document.createElement("canvas");
        let ctx = canv.getContext("2d");

        let firstLastCenter = [0, 0, 0, 0]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        let padding = Array.from(this.properties.padding);

        let width = 0, height = 0;
        let renderPromise = null;

        if(this.type == "skylt"){
            let w = [0], h = [0], j = 0;

            let totalLineSpacing = 0;

            let ch = this.children.map((c, i) => {
                let isn = c.type == "newline";

                if(isn || (i > 0 && this.properties.blockDisplay)){
                    j++;
                    w.push(0);
                    h.push(0);
                    totalLineSpacing += (this.properties.blockDisplay ? this.properties.lineSpacing : c.properties.lineSpacing);
                }

                let c2 = { isNewline: isn, r: c.render(), row: j, bw: c.properties.borderWidth };
                if(!isn){
                    if(w[j] > 0){
                        w[j] += SKYLT_ELEMENT_SPACING_X;
                    }

                    c2.x = w[j];
                    w[j] += c2.r.w + 2 * c2.bw;

                    let h0 = c2.r.h + 2 * c2.bw;
                    if(h0 > h[j]) h[j] = h0;
                }

                return c2;
            });

            canv.width = width = Math.max(...w) + padding[0] + padding[2];
            canv.height = height = h.reduce((a, b) => a + b, 0) + padding[1] + padding[3] + totalLineSpacing;

            ch = ch.map(c2 => {
                if(c2.isNewline) return c2;

                if(!this.properties.blockDisplay){
                    c2.x += SignElement.calculateAlignmentOffset(this.properties.alignContents, w[c2.row], canv.width - padding[0] - padding[2]);
                }

                return c2;
            });

            // mitt-x (element), se även if-sats nedan
            firstLastCenter[0] = padding[0] + ch[0].x + ch[0].bw;
            firstLastCenter[2] = padding[0] + ch[ch.length - 1].x + ch[ch.length - 1].bw;

            // mitt-y (rad), se även if-sats nedan
            firstLastCenter[1] = padding[1];
            firstLastCenter[3] = canv.height - padding[3];

            if(this.properties.anchorForwarded){
                firstLastCenter[0] += ch[0].r.flc[0];
                firstLastCenter[1] += ch[0].bw + ch[0].r.flc[1];
                firstLastCenter[2] += ch[ch.length - 1].r.flc[2];
                firstLastCenter[3] += ch[ch.length - 1].bw - h[h.length - 1] + ch[ch.length - 1].r.flc[3];
            }else{
                firstLastCenter[0] += Math.floor(ch[0].r.w / 2);
                firstLastCenter[1] += Math.floor(h[0] / 2);
                firstLastCenter[2] += Math.floor(ch[ch.length - 1].r.w / 2);
                firstLastCenter[3] += Math.floor(-h[h.length - 1] / 2);
            }

            let y = 0;

            renderPromise = Promise.all(ch.map((c2, i) => {
                if(c2.isNewline || (i > 0 && this.properties.blockDisplay)){
                    y += this.children[i].properties.lineSpacing;
                    y += h[c2.row - 1];
                }

                if(c2.isNewline) return;

                const y1 = y;
                return c2.r.data.then(d => {
                    let dx = 0, outerWidth = this.properties.blockDisplay ? (canv.width - padding[0] - padding[2]) : (c2.r.w + 2 * c2.bw);

                    if(this.properties.blockDisplay){
                        dx += SignElement.calculateAlignmentOffset(this.children[i].properties.alignContents, w[c2.row], outerWidth);
                    }

                    SignElement.drawWithBorder(
                        ctx,
                        padding[0] + c2.x,
                        padding[1] + y1 + Math.floor((h[c2.row] - c2.r.h) / 2) - c2.bw,
                        d,
                        this.children[i].properties,
                        dx, 0,
                        outerWidth
                    );
                });
            })).then(() => canv);
        }else if(this.type == "vagnr" || this.type == "text"){
            ctx.font = "32px " + this.properties.font;

            let box = ctx.measureText(this.properties.value);

            canv.width = width = Math.floor(box.width) + padding[0] + padding[2];
            canv.height = height = this.properties.lineHeight + padding[1] + padding[3];

            firstLastCenter[0] = Math.floor(canv.width / 2);
            firstLastCenter[1] = Math.floor(canv.height / 2);
            firstLastCenter[2] = firstLastCenter[0];
            firstLastCenter[3] = firstLastCenter[1];

            renderPromise = new Promise(res => {
                if(this.properties.dashedInset){
                    let bw = this.properties.borderWidth;

                    roundedRect(
                        ctx,
                        bw, bw,
                        canv.width - 2 * bw, canv.height - 2 * bw,
                        bw,
                        this.properties.color,
                        this.properties.borderRadius,
                        false,
                        "transparent",
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

            width = symbolType.width;
            height = symbolType.height;
            Object.assign(img, { width, height });

            canv.width = (width += (padding[0] + padding[2]));
            canv.height = (height += 2 * (padding[1] + padding[3]));

            renderPromise = new Promise((res, rej) => {
                img.addEventListener("load", () => {
                    ctx.drawImage(img, padding[0], padding[1], img.width, img.height);
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

        return { flc: firstLastCenter, w: width, h: height, data: renderPromise };
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

            let result = s.render();

            let rse = [ result.w + 2 * s.properties.borderWidth, result.h + 2 * s.properties.borderWidth ];

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
                    topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[1] - s.properties.borderWidth;
                    break;
                case "middle-last":
                    topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[3] - s.properties.borderWidth;
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

            return { renderPromise: result.data, x: leftX, y: topY, p: s.properties };
        });

        canvas.width = 2 * prop.borderWidth + (boundingBox[1] - boundingBox[0]) + 2 * prop.padding;
        canvas.height = 2 * prop.borderWidth + (boundingBox[3] - boundingBox[2]) + 2 * prop.padding;

        //ctx.fillStyle = prop.background;
        //ctx.fillRect(0, 0, canvas.width, canvas.height);

        roundedRect(ctx, 0, 0, canvas.width, canvas.height, prop.borderWidth, prop.color, prop.borderRadius, prop.fillCorners, prop.background);

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
                    rendered.width + 2 * res.p.borderWidth
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
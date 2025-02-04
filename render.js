// Priority:
// 1. Specified value
// 2. Value from parent (if property is inherited)
// 3. Default value (from DEFAULT_PROPERTIES or DEFAULTS)
// 4. Global defaults (GLOBAL_DEFAULTS)

const INHERITED = ["color", "background", "font", "borderRadius", "lineHeight"]; // properties that can be inherited

const GLOBAL_DEFAULTS = {
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
    "lineHeight": 44
};

const DEFAULT_PROPERTIES = {
    "_noderoot": {
        "anchorForwarded": true,
        "lineSpacing": 0
    },
    "skylt": {
        "padding": 5,
        "lineSpacing": 4,
        "blockDisplay": false,
        "anchorForwarded": false
    },
    "vagnr": {
        "value": "000",
        "borderWidth": 3,
        "borderRadius": 4,
        "dashedInset": false,
        "padding": [14, 3]
    },
    "text": {
        "value": "Text"
    },
    "newline": {}
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

class SignElement{
    constructor(data, parentProperties){
        this.type = data.type;

        let prop = data.properties || {};

        INHERITED.forEach(key => {
            if(prop[key] !== undefined) return;
            prop[key] = parentProperties[key];
        });

        this.properties = Object.assign({}, GLOBAL_DEFAULTS, DEFAULT_PROPERTIES[data.type], prop);
        this.children = (data.elements || []).map(element => new SignElement(element, this.properties));

        if(!Array.isArray(this.properties.padding)) this.properties.padding = [this.properties.padding, this.properties.padding];
    }

    render(){
        let canv = document.createElement("canvas");
        let ctx = canv.getContext("2d");

        let firstLastCenter = [0, 0, 0, 0]; // [cx_first, cy_firstrow, cx_last, cy_lastrow]

        let padding = Array.from(this.properties.padding);
        //let bw = this.properties.borderWidth;
        //padding[0] += bw; padding[1] += bw;

        if(this.type == "skylt" || this.type == "_noderoot"){
            let w = [0], h = [0], j = 0;

            let ch = this.children.map((c, i) => {
                let c2 = { isNewline: c.type == "newline", r: c.render(), row: j, bw: c.properties.borderWidth };
                if(i > 0 && (c2.isNewline || this.properties.blockDisplay)){
                    j = ++c2.row;
                    w.push(0);
                    h.push(0);
                }else if(w[j] > 0){
                    w[j] += SKYLT_ELEMENT_SPACING_X;
                }

                if(!c2.isNewline){
                    c2.x = w[j];
                    w[j] += c2.r.data.width + 2 * c2.bw;

                    let h0 = c2.r.data.height + 2 * c2.bw;
                    if(h0 > h[j]) h[j] = h0;
                }

                return c2;
            });

            canv.width = Math.max(...w) + 2 * padding[0];
            canv.height = h.reduce((a, b) => a + b, 0) + 2 * padding[1] + this.properties.lineSpacing * j;

            ch = ch.map(c2 => {
                if(c2.isNewline) return c2;

                switch(this.properties.alignContents){
                    case "center":
                        c2.x += Math.floor((canv.width - 2 * padding[0] - w[c2.row]) / 2);
                        break;
                    case "right":
                        c2.x += canv.width - w[c2.row] - 2 * padding[0];
                        break;
                    default:
                        // "left" or unknown value (left-aligned is the default)
                }

                return c2;
            });

            let y = 0;

            ch.forEach((c2, i) => {
                if(c2.isNewline || i == 0 || this.properties.blockDisplay){
                    if(i > 0) y += (h[c2.row] + this.properties.lineSpacing);

                    if(c2.isNewline) return;
                }

                let border = [
                    padding[0] + c2.x, padding[1] + y + Math.floor((h[c2.row] - c2.r.data.height) / 2) - c2.bw,
                    c2.r.data.width + 2 * c2.bw, c2.r.data.height + 2 * c2.bw
                ];

                if(this.properties.blockDisplay){
                    border[0] = padding[0];
                    border[2] = canv.width - 2 * padding[0];
                }

                roundedRect(
                    ctx,
                    border[0], border[1],
                    border[2], border[3],
                    c2.bw,
                    this.children[i].properties.color,
                    this.children[i].properties.borderRadius,
                    this.children[i].properties.background
                );

                ctx.drawImage(
                    c2.r.data,
                    padding[0] + c2.x + c2.bw, padding[1] + y + Math.floor((h[c2.row] - c2.r.data.height) / 2)
                );
            });

            if(this.properties.anchorForwarded){
                // mitt-x (element)
                firstLastCenter[0] = padding[0] + ch[0].x + ch[0].bw + ch[0].r.flc[0];
                firstLastCenter[2] = padding[0] + ch[ch.length - 1].x + ch[ch.length - 1].bw + ch[ch.length - 1].r.flc[2];

                // mitt-y (rad)
                firstLastCenter[1] = padding[1] + ch[0].bw + ch[0].r.flc[1];
                firstLastCenter[3] = canv.height - padding[1] - h[h.length - 1] + ch[ch.length - 1].bw + ch[ch.length - 1].r.flc[3];
            }else{
                // mitt-x (element)
                firstLastCenter[0] = padding[0] + ch[0].x + Math.floor(ch[0].r.data.width / 2) + ch[0].bw;
                firstLastCenter[2] = padding[0] + ch[ch.length - 1].x + Math.floor(ch[ch.length - 1].r.data.width / 2) + ch[ch.length - 1].bw;

                // mitt-y (rad)
                firstLastCenter[1] = padding[1] + Math.floor(h[0] / 2);
                firstLastCenter[3] = canv.height + Math.floor(-h[h.length - 1] / 2) - padding[1];
            }
        }else if(this.type == "vagnr" || this.type == "text"){
                ctx.font = "32px " + this.properties.font;

                let box = ctx.measureText(this.properties.value);

                canv.width = box.width + 2 * padding[0];
                canv.height = this.properties.lineHeight + 2 * padding[1];

                if(this.properties.dashedInset){
                    roundedRect(
                        ctx,
                        bw, bw,
                        canv.width - 2 * bw, canv.height - 2 * bw,
                        bw,
                        this.properties.color,
                        this.properties.borderRadius,
                        "transparent",
                        [10, 10]
                    );
                }

                ctx.font = "32px " + this.properties.font;
                ctx.textBaseline = "middle";
                ctx.textAlign = "left";

                firstLastCenter[0] = Math.floor(canv.width / 2);
                firstLastCenter[1] = Math.floor(canv.height / 2);
                firstLastCenter[2] = firstLastCenter[0];
                firstLastCenter[3] = firstLastCenter[1];

                ctx.fillStyle = this.properties.color;
                ctx.fillText(this.properties.value, padding[0], firstLastCenter[1]);
        }else if(this.type == "newline"){
            canv.width = 0;
            canv.height = 0;
        }else{
            alert("Fel!");
        }

        return { flc: firstLastCenter, data: canv };
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
            let s = new SignElement({ "type": "_noderoot", "elements": [n.data] }, prop);

            let result = s.render();

            let leftX = t.nodes[nodeName].x.map(x => x * t.width), topY = t.nodes[nodeName].y.map(y => y * t.height);

            switch(n.anchor.x){
                case "right":
                    leftX = leftX[1] - result.data.width;
                    break;
                case "center":
                    leftX = Math.floor((leftX[0] + leftX[1]) / 2 - Math.floor(result.data.width / 2));
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
                    topY = topY[1] - result.data.height;
                    break;
                case "middle":
                    topY = Math.floor((topY[0] + topY[1]) / 2) - Math.floor(result.data.height / 2);
                    break;
                case "middle-first":
                    topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[1];
                    break;
                case "middle-last":
                    topY = Math.floor((topY[0] + topY[1]) / 2) - result.flc[3];
                    break;
                default:
                    topY = topY[0];
            }

            boundingBox = [
                Math.min(boundingBox[0], leftX),
                Math.max(boundingBox[1], leftX + result.data.width),
                Math.min(boundingBox[2], topY),
                Math.max(boundingBox[3], topY + result.data.height)
            ];

            return {data: result.data, x: leftX, y: topY};
        });

        canvas.width = 2 * prop.borderWidth + (boundingBox[1] - boundingBox[0]) + 2 * prop.padding;
        canvas.height = 2 * prop.borderWidth + (boundingBox[3] - boundingBox[2]) + 2 * prop.padding;

        ctx.fillStyle = prop.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        roundedRect(ctx, 0, 0, canvas.width, canvas.height, prop.borderWidth, prop.color, prop.borderRadius);

        rendered.forEach(res => {
            ctx.drawImage(
                res.data,
                prop.padding + prop.borderWidth + res.x - boundingBox[0],
                prop.padding + prop.borderWidth + res.y - boundingBox[2]
            );
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
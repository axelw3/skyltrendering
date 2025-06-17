import type { Vec4, Vec2, NewDrawingArea } from "./typedefs.js";

export function roundedFrame<T>(ctx: NewDrawingArea<T>, x0: number, y0: number, innerWidth: number, innerHeight: number, nominalLineWidth: Vec4 = [4, 4, 4, 4], color: string = "#000", background: string | null, borderRadius: Vec4 = [0, 0, 0, 0], lineDash: Vec2 = [1, 0]){
    // lineDash = [längd, mellanrum]

    if(Math.max(...nominalLineWidth) <= 0) return;

    if(background !== null){
        ctx.fillStyle = background;
        if(borderRadius[0] > 0) ctx.fillRect(x0 - nominalLineWidth[0], y0 - nominalLineWidth[1], borderRadius[0], borderRadius[0]);
        if(borderRadius[1] > 0) ctx.fillRect(x0 + innerWidth + nominalLineWidth[2] - borderRadius[1], y0 - nominalLineWidth[1], borderRadius[1], borderRadius[1]);
        if(borderRadius[2] > 0) ctx.fillRect(x0 + innerWidth + nominalLineWidth[2] - borderRadius[2], y0 + innerHeight + nominalLineWidth[3] - borderRadius[2], borderRadius[2], borderRadius[2]);
        if(borderRadius[3] > 0) ctx.fillRect(x0 - nominalLineWidth[0], y0 + innerHeight + nominalLineWidth[3] - borderRadius[3], borderRadius[3], borderRadius[3]);
    }

    let p = ctx.createPath2D();

    let drawCorner = (cx: number, cy: number, signX: number, signY: number, i: number, outer: boolean) => {
        let w0 = nominalLineWidth[(Math.ceil(i / 2) * 2) % 4],
            w1 = nominalLineWidth[Math.floor(i / 2) * 2 + 1],
            br = borderRadius[i];

        let startAngle = ((i - 2) * Math.PI) / 2 + Math.PI/4;

        let v1 = startAngle - Math.PI/4,
            v2 = startAngle + Math.PI/4;

        if(outer){
            if(br > 0){
                p.ellipse(cx + signX * (w0 - br), cy + signY * (w1 - br), br, br, 0, v1, v2, false);
            }else{
                p[i > 0 ? "lineTo" : "moveTo"](cx + signX * w0, cy + signY * w1);
            }
        }else{
            if(br > 0){
                let arx = Math.max(br - w0, 0),
                    ary = Math.max(br - w1, 0);

                p.ellipse(cx - signX * arx, cy - signY * ary, arx, ary, 0, v2, v1, true);
            }else{
                p.lineTo(cx, cy);
            }
        }
    };

    drawCorner(x0, y0, -1, -1, 0, true);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1, true);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2, true);
    drawCorner(x0, y0 + innerHeight, -1, 1, 3, true);

    p.lineTo(x0 - nominalLineWidth[0], y0 + borderRadius[0] - nominalLineWidth[1]);
    p.lineTo(x0, y0 + Math.max(borderRadius[0] - nominalLineWidth[1], 0));

    drawCorner(x0, y0 + innerHeight, -1, 1, 3, false);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2, false);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1, false);
    drawCorner(x0, y0, -1, -1, 0, false);

    let drawLineDash = (innerLength: number, cb: (z: number, s: number) => void) => {
        let actualLineDash = [lineDash[0], lineDash[1]];
        let r = 0;
        while(true){
            r = (innerLength + actualLineDash[1]) % (actualLineDash[0] + actualLineDash[1]);
            if(r >= actualLineDash[1]) break;
            actualLineDash[0]++;
        }

        let z = Math.floor(r / 2);
        cb(0, z);
        while(z + actualLineDash[0] < innerLength){
            // en linje ryms
            z += actualLineDash[0];
            let lss = Math.min(innerLength - z, actualLineDash[1]);
            cb(z, lss); // mellanrum därefter
            z += lss;
        }
        cb(z, innerLength - z);
    };

    let pathRect = (x: number, y: number, w: number, h: number) => {
        p.moveTo(x, y);
        p.lineTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y);
        p.lineTo(x, y);
    };

    if(lineDash[1] > 0){
        // Ovanför
        drawLineDash(
            innerWidth - Math.max(0, borderRadius[0] - nominalLineWidth[0]) - Math.max(0, borderRadius[1] - nominalLineWidth[2]),
            (x, w) => pathRect(x0 + Math.max(0, borderRadius[0] - nominalLineWidth[0]) + x, y0 - nominalLineWidth[1], w, nominalLineWidth[1])
        );

        // Nedanför
        drawLineDash(
            innerWidth - Math.max(0, borderRadius[3] - nominalLineWidth[0]) - Math.max(0, borderRadius[2] - nominalLineWidth[2]),
            (x, w) => pathRect(x0 + Math.max(0, borderRadius[3] - nominalLineWidth[0]) + x, y0 + innerHeight, w, nominalLineWidth[3])
        );

        // Vänster
        drawLineDash(
            innerHeight - Math.max(0, borderRadius[0] - nominalLineWidth[1]) - Math.max(0, borderRadius[3] - nominalLineWidth[3]),
            (y, h) => pathRect(x0 - nominalLineWidth[0], y0 + Math.max(0, borderRadius[0] - nominalLineWidth[1]) + y, nominalLineWidth[0], h)
        );

        // Höger
        drawLineDash(
            innerHeight - Math.max(0, borderRadius[1] - nominalLineWidth[1]) - Math.max(0, borderRadius[2] - nominalLineWidth[3]),
            (y, h) => pathRect(x0 + innerWidth, y0 + Math.max(0, borderRadius[1] - nominalLineWidth[1]) + y, nominalLineWidth[2], h)
        );
    }

    //p.closePath();
    ctx.fillStyle = color;
    ctx.fill(p);
}


export function roundedFill<T>(ctx: NewDrawingArea<T>, x0: number, y0: number, innerWidth: number, innerHeight: number, borderWidth: Vec4 = [4, 4, 4, 4], borderRadius: Vec4 = [0, 0, 0, 0], background: string = "#fff"){
    // lineDash = [längd, mellanrum]

    ctx.fillStyle = background;

    if(Math.max(...borderWidth) === 0 || Math.max(...borderRadius) === 0){
        ctx.fillRect(x0 - borderWidth[0], y0 - borderWidth[1], innerWidth + borderWidth[0] + borderWidth[2], innerHeight + borderWidth[1] + borderWidth[3]);
        return;
    }

    let p = ctx.createPath2D();

    let drawCorner = (cx: number, cy: number, signX: number, signY: number, i: number) => {
        let w0 = borderWidth[(Math.ceil(i / 2) * 2) % 4],
            w1 = borderWidth[Math.floor(i / 2) * 2 + 1],
            br = borderRadius[i];

        let arx = Math.max(br - w0, 0),
            ary = Math.max(br - w1, 0);

        let startAngle = ((i - 2) * Math.PI) / 2;
        p.ellipse(
            cx - signX * arx, cy - signY * ary,
            arx + w0/2, ary + w1/2,
            0,
            startAngle, startAngle + Math.PI / 2,
            false
        );
    };

    drawCorner(x0, y0, -1, -1, 0);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2);
    drawCorner(x0, y0 + innerHeight, -1, 1, 3);

    ctx.fill(p);

    // mitten
    ctx.fillRect(
        x0 + Math.max(borderRadius[0], borderRadius[3]),
        y0 + Math.max(borderRadius[0], borderRadius[1]),
        innerWidth - Math.max(borderRadius[0], borderRadius[3]) - Math.max(borderRadius[1], borderRadius[2]),
        innerHeight - Math.max(borderRadius[0], borderRadius[1]) - Math.max(borderRadius[2], borderRadius[3])
    );
}
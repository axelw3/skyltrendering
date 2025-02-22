import type { DrawingContext, Vec4, Vec2 } from "./typedefs.js";

export function roundedFrame(ctx: DrawingContext, x0: number, y0: number, innerWidth: number, innerHeight: number, nominalLineWidth: Vec4 = [4, 4, 4, 4], color: string = "#000", borderRadius: Vec4 = [0, 0, 0, 0], lineDash: Vec2 = [1, 0]){
    // lineDash = [längd, mellanrum]

    if(Math.max(...nominalLineWidth) <= 0) return;

    let drawCorner = (cx: number, cy: number, signX: number, signY: number, i: number) => {
        let w0 = nominalLineWidth[(Math.ceil(i / 2) * 2) % 4],
            w1 = nominalLineWidth[Math.floor(i / 2) * 2 + 1],
            br = borderRadius[i];

        let arx = Math.max(br - w0, 0),
            ary = Math.max(br - w1, 0);

        cx -= signX * arx;
        cy -= signY * ary;

        let startAngle = ((i - 2) * Math.PI) / 2 + Math.PI/4;

        let v1 = startAngle - signX*signY*Math.PI/4,
            v2 = startAngle + signX*signY*Math.PI/4;

        ctx.beginPath();
        //ctx.moveTo(cx + signX * arx, cy);
        ctx.moveTo(cx + signX*(arx+w0), cy);
        ctx.lineTo(cx + signX*(arx+w0), cy + signY * Math.max(0, w1 - br));
        ctx.ellipse(cx + signX*Math.max(0, w0 - br), cy + signY * Math.max(0, w1 - br), br, br, 0, v1, v2, signX !== signY);
        ctx.lineTo(cx, cy + signY*(ary+w1));
        ctx.lineTo(cx, cy + signY*ary);
        ctx.ellipse(cx, cy, arx, ary, 0, v2, v1, signX === signY);
        //ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
    };

    drawCorner(x0, y0, -1, -1, 0);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2);
    drawCorner(x0, y0 + innerHeight, -1, 1, 3);

    let drawLineDash = (innerLength: number, cb: (z: number, s: number) => void) => {
        let actualLineDash = [lineDash[0], lineDash[1]];

        let r = 0;
        while(true){
            r = (innerLength + actualLineDash[1]) % (actualLineDash[0] + actualLineDash[1]);
            if(r >= actualLineDash[1]) break;
            actualLineDash[0]++;
        }

        let z = Math.floor(r / 2);
        do{
            cb(z, actualLineDash[0]);
            z += actualLineDash[0] + actualLineDash[1];
        }while(z + actualLineDash[0] <= innerLength);

    };

    ctx.fillStyle = color;

    // Ovanför
    drawLineDash(
        innerWidth - Math.max(0, borderRadius[0] - nominalLineWidth[0]) - Math.max(0, borderRadius[1] - nominalLineWidth[2]),
        (x, w) => ctx.fillRect(x0 + Math.max(0, borderRadius[0] - nominalLineWidth[0]) + x, y0 - nominalLineWidth[1], w, nominalLineWidth[1])
    );

    // Nedanför
    drawLineDash(
        innerWidth - Math.max(0, borderRadius[3] - nominalLineWidth[0]) - Math.max(0, borderRadius[2] - nominalLineWidth[2]),
        (x, w) => ctx.fillRect(x0 + Math.max(0, borderRadius[3] - nominalLineWidth[0]) + x, y0 + innerHeight, w, nominalLineWidth[3])
    );

    // Vänster
    drawLineDash(
        innerHeight - Math.max(0, borderRadius[0] - nominalLineWidth[1]) - Math.max(0, borderRadius[3] - nominalLineWidth[3]),
        (y, h) => ctx.fillRect(x0 - nominalLineWidth[0], y0 + Math.max(0, borderRadius[0] - nominalLineWidth[1]) + y, nominalLineWidth[0], h)
    );

    // Höger
    drawLineDash(
        innerHeight - Math.max(0, borderRadius[1] - nominalLineWidth[1]) - Math.max(0, borderRadius[2] - nominalLineWidth[3]),
        (y, h) => ctx.fillRect(x0 + innerWidth, y0 + Math.max(0, borderRadius[1] - nominalLineWidth[1]) + y, nominalLineWidth[2], h)
    );
}


export function roundedFill(ctx: DrawingContext, x0: number, y0: number, innerWidth: number, innerHeight: number, borderWidth: Vec4 = [4, 4, 4, 4], borderRadius: Vec4 = [0, 0, 0, 0], background: string = "#fff", fillCorners: boolean = false){
    // lineDash = [längd, mellanrum]

    ctx.fillStyle = background;

    if(fillCorners || Math.max(...borderWidth) === 0){
        ctx.fillRect(x0 - borderWidth[0], y0 - borderWidth[1], innerWidth + borderWidth[0] + borderWidth[2], innerHeight + borderWidth[1] + borderWidth[3]);
        return;
    }

    let drawCorner = (cx: number, cy: number, signX: number, signY: number, i: number) => {
        let arx = borderRadius[i] + borderWidth[(Math.ceil(i / 2) * 2) % 4] / 2,
            ary = borderRadius[i] + borderWidth[Math.floor(i / 2) * 2 + 1] / 2;

        let startAngle = ((i - 2) * Math.PI) / 2;
        ctx.ellipse(
            cx - signX * borderRadius[i], cy - signY * borderRadius[i],
            arx, ary,
            0,
            startAngle, startAngle + Math.PI / 2,
            false
        );
    };

    ctx.beginPath();
    drawCorner(x0, y0, -1, -1, 0);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2);
    drawCorner(x0, y0 + innerHeight, -1, 1, 3);
    ctx.fill();

    // mitten
    ctx.fillRect(
        x0 + Math.max(borderRadius[0], borderRadius[3]),
        y0 + Math.max(borderRadius[0], borderRadius[1]),
        innerWidth - Math.max(borderRadius[0], borderRadius[3]) - Math.max(borderRadius[1], borderRadius[2]),
        innerHeight - Math.max(borderRadius[0], borderRadius[1]) - Math.max(borderRadius[2], borderRadius[3])
    );
}
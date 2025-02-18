function roundedFrame(ctx, x0, y0, innerWidth, innerHeight, nominalLineWidth = [4, 4, 4, 4], color = "#000", borderRadius = [0, 0, 0, 0], lineDash = [1, 0]){
    // lineDash = [längd, mellanrum]

    if(Math.max(...nominalLineWidth) <= 0) return;

    let drawCorner = (cx, cy, signX, signY, i) => {
        cx -= signX * borderRadius[i];
        cy -= signY * borderRadius[i];

        let arx = borderRadius[i] + nominalLineWidth[(Math.ceil(i / 2) * 2) % 4],
            ary = borderRadius[i] + nominalLineWidth[Math.floor(i / 2) * 2 + 1];

        ctx.beginPath();
        let startAngle = ((i - 2) * Math.PI) / 2;
        ctx.ellipse(cx, cy, arx, ary, 0, startAngle, startAngle + Math.PI / 2, false);
        ctx.ellipse(cx, cy, borderRadius[i], borderRadius[i], 0, startAngle + Math.PI / 2, startAngle, true);

        ctx.fillStyle = color;
        ctx.fill();
    };

    drawCorner(x0, y0, -1, -1, 0);
    drawCorner(x0 + innerWidth, y0, 1, -1, 1);
    drawCorner(x0 + innerWidth, y0 + innerHeight, 1, 1, 2);
    drawCorner(x0, y0 + innerHeight, -1, 1, 3);

    let drawLineDash = (innerLength, cb) => {
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
        innerWidth - (borderRadius[0] + borderRadius[1]),
        (x, w) => ctx.fillRect(x0 + borderRadius[0] + x, y0 - nominalLineWidth[1], w, nominalLineWidth[1])
    );

    // Nedanför
    drawLineDash(
        innerWidth - (borderRadius[3] + borderRadius[2]),
        (x, w) => ctx.fillRect(x0 + borderRadius[3] + x, y0 + innerHeight, w, nominalLineWidth[3])
    );

    // Vänster
    drawLineDash(
        innerHeight - (borderRadius[0] + borderRadius[3]),
        (y, h) => ctx.fillRect(x0 - nominalLineWidth[0], y0 + borderRadius[0] + y, nominalLineWidth[0], h)
    );

    // Höger
    drawLineDash(
        innerHeight - (borderRadius[1] + borderRadius[2]),
        (y, h) => ctx.fillRect(x0 + innerWidth, y0 + borderRadius[1] + y, nominalLineWidth[2], h)
    );
}


function roundedFill(ctx, x0, y0, innerWidth, innerHeight, borderWidth = [4, 4, 4, 4], borderRadius = [0, 0, 0, 0], background = "#fff", fillCorners = false){
    // lineDash = [längd, mellanrum]

    ctx.fillStyle = background;

    if(fillCorners || Math.max(...borderWidth) === 0){
        ctx.fillRect(x0 - borderWidth[0], y0 - borderWidth[1], innerWidth + borderWidth[0] + borderWidth[2], innerHeight + borderWidth[1] + borderWidth[3]);
        return;
    }

    let drawCorner = (cx, cy, signX, signY, i) => {
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
function roundedFrame(ctx, x0, y0, outerWidth, outerHeight, lineWidth, color, borderRadius, lineDash = [1, 0]){
    // lineDash = [längd, mellanrum]

    if(Math.max(...lineWidth) <= 0) return;

    let drawCorner = (cx, cy, signX, signY, i) => {
        cx -= signX * borderRadius[i];
        cy -= signY * borderRadius[i];

        let arx = borderRadius[i] + lineWidth[(Math.ceil(i / 2) * 2) % 4],
            ary = borderRadius[i] + lineWidth[Math.floor(i / 2) * 2 + 1];

        ctx.beginPath();
        let startAngle = ((i - 2) * Math.PI) / 2;
        ctx.ellipse(cx, cy, arx, ary, 0, startAngle, startAngle + Math.PI / 2, false);
        ctx.ellipse(cx, cy, borderRadius[i], borderRadius[i], 0, startAngle + Math.PI / 2, startAngle, true);

        ctx.fillStyle = color;
        ctx.fill();
    };

    drawCorner(x0 + lineWidth[0], y0 + lineWidth[1], -1, -1, 0);
    drawCorner(x0 + outerWidth - lineWidth[2], y0 + lineWidth[1], 1, -1, 1);
    drawCorner(x0 + outerWidth - lineWidth[2], y0 + outerHeight - lineWidth[3], 1, 1, 2);
    drawCorner(x0 + lineWidth[0], y0 + outerHeight - lineWidth[3], -1, 1, 3);

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
        outerWidth - lineWidth[0] - lineWidth[2] - (borderRadius[0] + borderRadius[1]),
        (x, w) => ctx.fillRect(x0 + lineWidth[0] + borderRadius[0] + x, y0, w, lineWidth[1])
    );

    // Nedanför
    drawLineDash(
        outerWidth - lineWidth[0] - lineWidth[2] - (borderRadius[3] + borderRadius[2]),
        (x, w) => ctx.fillRect(x0 + lineWidth[0] + borderRadius[3] + x, y0 + outerHeight - lineWidth[3], w, lineWidth[3])
    );

    // Vänster
    drawLineDash(
        outerHeight - lineWidth[1] - lineWidth[3] - (borderRadius[0] + borderRadius[3]),
        (y, h) => ctx.fillRect(x0, y0 + lineWidth[1] + borderRadius[0] + y, lineWidth[0], h)
    );

    // Höger
    drawLineDash(
        outerHeight - lineWidth[1] - lineWidth[3] - (borderRadius[1] + borderRadius[2]),
        (y, h) => ctx.fillRect(x0 + outerWidth - lineWidth[2], y0 + lineWidth[1] + borderRadius[1] + y, lineWidth[2], h)
    );
}


function roundedFill(ctx, x0, y0, innerWidth, innerHeight, lineWidth, borderRadius, background, borderSize, fillCorners = false){
    // lineDash = [längd, mellanrum]

    ctx.fillStyle = background;

    if(fillCorners || Math.max(...lineWidth) <= 0){
        ctx.fillRect(x0 - borderSize[0], y0 - borderSize[1], innerWidth + borderSize[0] + borderSize[2], innerHeight + borderSize[1] + borderSize[3]);
        return;
    }

    let drawCorner = (cx, cy, signX, signY, i) => {
        let arx = borderRadius[i] + lineWidth[(Math.ceil(i / 2) * 2) % 4] / 2,
            ary = borderRadius[i] + lineWidth[Math.floor(i / 2) * 2 + 1] / 2;

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
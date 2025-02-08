function roundedFrame(ctx, x0, y0, outerWidth, outerHeight, lineWidth, color, borderRadius, lineDash = [1, 0]){
    // lineDash = [längd, mellanrum]

    if(Math.max(...lineWidth) <= 0) return;

    let drawCorner = (cx, cy, signX, signY, i) => {
        cx -= signX * borderRadius[i];
        cy -= signY * borderRadius[i];

        let arx = borderRadius[i] + lineWidth[(Math.ceil(i / 2) * 2) % 4],
            ary = borderRadius[i] + lineWidth[Math.floor(i / 2) * 2 + 1];

        ctx.beginPath();
        let startAngle = [-Math.PI, -Math.PI/2, 0, Math.PI/2][i]; // ((i - 2) * Math.PI) / 2;
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


function roundedFill(ctx, x0, y0, outerWidth, outerHeight, lineWidth, borderRadius, background, fillCorners = false){
    // lineDash = [längd, mellanrum]

    ctx.fillStyle = background;

    if(fillCorners || Math.max(...lineWidth) <= 0){
        ctx.fillRect(x0, y0, outerWidth, outerHeight);
        return;
    }

    let drawCorner = (cx, cy, signX, signY, i) => {
        cx -= signX * borderRadius[i];
        cy -= signY * borderRadius[i];

        ctx.beginPath();
        let ar = borderRadius[i] + lineWidth[i] / 2;
        ctx.moveTo(cx, cy + signY * ar);
        ctx.arcTo(cx + signX * ar, cy + signY * ar, cx + signX * ar, cy, ar);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        let m = Math.max(borderRadius[i], borderRadius[(i + 1) % 4]);

        if(signX === signY){
            ctx.fillRect(
                cx, cy + signY * borderRadius[i],
                -signX * (outerWidth - 2 * lineWidth[i] - (borderRadius[i] + borderRadius[(i + 1) % 4])), -signY * m
            );
        }else{
            ctx.fillRect(
                cx + signX * borderRadius[i], cy,
                -signX * m, -signY * (outerHeight - 2 * lineWidth[i] - (borderRadius[i] + borderRadius[(i + 1) % 4]))
            );
        }
    };

    drawCorner(x0 + lineWidth[0], y0 + lineWidth[1], -1, -1, 0);
    drawCorner(x0 + outerWidth - lineWidth[2], y0 + lineWidth[1], 1, -1, 1);
    drawCorner(x0 + outerWidth - lineWidth[2], y0 + outerHeight - lineWidth[3], 1, 1, 2);
    drawCorner(x0 + lineWidth[0], y0 + outerHeight - lineWidth[3], -1, 1, 3);

    // mitten
    ctx.fillRect(
        x0 + lineWidth[0] + Math.max(borderRadius[0], borderRadius[3]),
        y0 + lineWidth[1] + Math.max(borderRadius[0], borderRadius[1]),
        outerWidth - lineWidth[0] - lineWidth[2] - Math.max(borderRadius[0], borderRadius[3]) - Math.max(borderRadius[1], borderRadius[2]),
        outerHeight - lineWidth[1] - lineWidth[3] - Math.max(borderRadius[0], borderRadius[1]) - Math.max(borderRadius[2], borderRadius[3])
    );
}
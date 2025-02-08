function roundedRect(ctx, x0, y0, outerWidth, outerHeight, lineWidth, color, borderRadius, fillCorners = false, background = "transparent", lineDash = [1, 0]){
    // lineDash = [längd, mellanrum]

    if((lineWidth <= 0 || fillCorners) && background != "transparent"){
        ctx.fillStyle = background;
        ctx.fillRect(x0, y0, outerWidth, outerHeight);
    }

    if(lineWidth <= 0) return;

    let drawCorner = (cx, cy, signX, signY, i) => {
        cx -= signX * borderRadius[i];
        cy -= signY * borderRadius[i];

        ctx.beginPath();
        ctx.moveTo(cx + signX * (lineWidth + borderRadius[i]), cy);
        ctx.arcTo(cx + signX * (lineWidth + borderRadius[i]), cy + signY * (lineWidth + borderRadius[i]), cx, cy + signY * (lineWidth + borderRadius[i]), borderRadius[i] + lineWidth);
        ctx.lineTo(cx, cy + signY * borderRadius[i]);
        ctx.arcTo(cx + signX * borderRadius[i], cy + signY * borderRadius[i], cx + signX * borderRadius[i], cy, borderRadius[i]);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if(background != "transparent" && !fillCorners){
            ctx.beginPath();
            ctx.moveTo(cx, cy + signY * borderRadius[i]);
            ctx.arcTo(cx + signX * borderRadius[i], cy + signY * borderRadius[i], cx + signX * borderRadius[i], cy, borderRadius[i]);
            ctx.lineTo(cx, cy);
            ctx.closePath();
            ctx.fillStyle = background;
            ctx.fill();
        }
    };

    drawCorner(x0 + lineWidth, y0 + lineWidth, -1, -1, 0);
    drawCorner(x0 + outerWidth - lineWidth, y0 + lineWidth, 1, -1, 1);
    drawCorner(x0 + outerWidth - lineWidth, y0 + outerHeight - lineWidth, 1, 1, 2);
    drawCorner(x0 + lineWidth, y0 + outerHeight - lineWidth, -1, 1, 3);

    if(background != "transparent" && !fillCorners){
        ctx.fillStyle = background;
        // vänster
        ctx.fillRect(x0 + lineWidth, y0 + lineWidth + borderRadius[0], Math.max(borderRadius[0], borderRadius[3]), outerHeight - 2 * lineWidth - (borderRadius[0] + borderRadius[3]));

        // höger
        ctx.fillRect(x0 + outerWidth - lineWidth, y0 + lineWidth + borderRadius[1], -Math.max(borderRadius[1], borderRadius[2]), outerHeight - 2 * lineWidth - (borderRadius[1] + borderRadius[2]));

        // ovanför
        ctx.fillRect(x0 + lineWidth + borderRadius[0], y0 + lineWidth, outerWidth - 2 * lineWidth - (borderRadius[0] + borderRadius[1]), Math.max(borderRadius[0], borderRadius[1]));

        // nedanför
        ctx.fillRect(x0 + lineWidth + borderRadius[3], y0 + outerHeight - lineWidth, outerWidth - 2 * lineWidth - (borderRadius[2] + borderRadius[3]), -Math.max(borderRadius[2], borderRadius[3]));

        ctx.fillRect(
            x0 + lineWidth + Math.max(borderRadius[0], borderRadius[3]),
            y0 + lineWidth + Math.max(borderRadius[0], borderRadius[1]),
            outerWidth - 2 * lineWidth - Math.max(borderRadius[0], borderRadius[3]) - Math.max(borderRadius[1], borderRadius[2]),
            outerHeight - 2 * lineWidth - Math.max(borderRadius[0], borderRadius[1]) - Math.max(borderRadius[2], borderRadius[3])
        );
    }

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
        outerWidth - 2 * lineWidth - (borderRadius[0] + borderRadius[1]),
        (x, w) => ctx.fillRect(x0 + lineWidth + borderRadius[0] + x, y0, w, lineWidth)
    );

    // Nedanför
    drawLineDash(
        outerWidth - 2 * lineWidth - (borderRadius[3] + borderRadius[2]),
        (x, w) => ctx.fillRect(x0 + lineWidth + borderRadius[3] + x, y0 + outerHeight - lineWidth, w, lineWidth)
    );

    // Vänster
    drawLineDash(
        outerHeight - 2 * lineWidth - (borderRadius[0] + borderRadius[3]),
        (y, h) => ctx.fillRect(x0, y0 + lineWidth + borderRadius[0] + y, lineWidth, h)
    );

    // Höger
    drawLineDash(
        outerHeight - 2 * lineWidth - (borderRadius[1] + borderRadius[2]),
        (y, h) => ctx.fillRect(x0 + outerWidth - lineWidth, y0 + lineWidth + borderRadius[1] + y, lineWidth, h)
    );
}
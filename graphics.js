function roundedRect(ctx, x0, y0, outerWidth, outerHeight, lineWidth, color, borderRadius, fillCorners = false, background = "transparent", lineDash = [1, 0]){
    // lineDash = [längd, mellanrum]

    if((lineWidth <= 0 || fillCorners) && background != "transparent"){
        ctx.fillStyle = background;
        ctx.fillRect(x0, y0, outerWidth, outerHeight);
    }

    if(lineWidth <= 0) return;

    let drawCorner = (cx, cy, signX, signY) => {
        ctx.beginPath();
        ctx.moveTo(cx + signX * (lineWidth + borderRadius), cy);
        ctx.arcTo(cx + signX * (lineWidth + borderRadius), cy + signY * (lineWidth + borderRadius), cx, cy + signY * (lineWidth + borderRadius), borderRadius + lineWidth);
        ctx.lineTo(cx, cy + signY * borderRadius);
        ctx.arcTo(cx + signX * borderRadius, cy + signY * borderRadius, cx + signX * borderRadius, cy, borderRadius);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        /*
            ctx.fillStyle = this.properties.background;
            ctx.fillRect(0, 0, canv.width, canv.height);
        */

        if(background != "transparent" && !fillCorners){
            ctx.beginPath();
            ctx.moveTo(cx, cy + signY * borderRadius);
            ctx.arcTo(cx + signX * borderRadius, cy + signY * borderRadius, cx + signX * borderRadius, cy, borderRadius);
            ctx.lineTo(cx, cy);
            ctx.closePath();
            ctx.fillStyle = background;
            ctx.fill();
        }
    };

    drawCorner(x0 + lineWidth + borderRadius, y0 + lineWidth + borderRadius, -1, -1);
    drawCorner(x0 + outerWidth - lineWidth - borderRadius, y0 + lineWidth + borderRadius, 1, -1);
    drawCorner(x0 + lineWidth + borderRadius, y0 + outerHeight - lineWidth - borderRadius, -1, 1);
    drawCorner(x0 + outerWidth - lineWidth - borderRadius, y0 + outerHeight - lineWidth - borderRadius, 1, 1);

    if(background != "transparent" && !fillCorners){
        ctx.fillStyle = background;
        ctx.fillRect(x0 + lineWidth, y0 + lineWidth + borderRadius, outerWidth - 2 * lineWidth, outerHeight - 2 * (lineWidth + borderRadius));
        ctx.fillRect(x0 + lineWidth + borderRadius, y0 + lineWidth, outerWidth - 2 * (lineWidth + borderRadius), outerHeight - 2 * lineWidth);
    }

    let restX = 0;

    let actualLineDash = [lineDash[0], lineDash[1]];

    while(true){
        restX = (outerWidth - 2 * (lineWidth + borderRadius) + actualLineDash[1]) % (actualLineDash[0] + actualLineDash[1]);
        if(restX >= actualLineDash[1]) break;
        actualLineDash[0]++;
    }

    let x = Math.floor(restX / 2);
    do{
        ctx.fillStyle = color;
        ctx.fillRect(x0 + lineWidth + borderRadius + x, y0, actualLineDash[0], lineWidth);
        ctx.fillRect(x0 + lineWidth + borderRadius + x, y0 + outerHeight - lineWidth, actualLineDash[0], lineWidth);
        x += actualLineDash[0] + actualLineDash[1];
    }while(x + actualLineDash[0] <= outerWidth - 2 * (lineWidth + borderRadius));


    actualLineDash = [lineDash[0], lineDash[1]];
    let restY = 0;

    while(true){
        restY = (outerHeight - 2 * (lineWidth + borderRadius) + actualLineDash[1]) % (actualLineDash[0] + actualLineDash[1]);
        if(restY >= actualLineDash[1]) break;
        actualLineDash[0]++;
    }

    let y = Math.floor(restY / 2);
    do{
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0 + lineWidth + borderRadius + y, lineWidth, actualLineDash[0]);
        ctx.fillRect(x0 + outerWidth - lineWidth, y0 + lineWidth + borderRadius + y, lineWidth, actualLineDash[0]);
        y += actualLineDash[0] + actualLineDash[1];
    }while(y + actualLineDash[0] <= outerHeight - 2 * (lineWidth + borderRadius));
}
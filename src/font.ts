import { NewDrawingArea, Vec4 } from "./typedefs";

type VectorGlyph = {
    horizAdvX?: number;
    outline?: string;
};

type FontProperties = {
    metadata?: string;
    horizAdvX: number;
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    bbox: Vec4;
};

type FontDefinition = {
    properties: FontProperties;
    missingGlyph: VectorGlyph;
    glyphs: (VectorGlyph & {id: number;})[];
};

export class VectorFont{
    private properties: FontProperties;
    private missingGlyph: VectorGlyph;
    private glyphs: Map<number, VectorGlyph>;

    public constructor(data: FontDefinition){
        this.properties = data.properties;
        this.missingGlyph = data.missingGlyph;
        this.glyphs = new Map<number, VectorGlyph>();

        data.glyphs.forEach(gl => {
            this.glyphs.set(gl.id, gl);
        });
    }

    public fillText(ctx: NewDrawingArea<any>, x: number, y: number, text: string, color: string, fontSize: number): void{
        const SCALE = fontSize / this.properties.unitsPerEm;
        const MIDDLE_Y = this.properties.ascent / 2; // mitten-y, räknat uppåt från baseline (= 0)

        ctx.fillStyle = color;
        text.split("").map(ch => ch.charCodeAt(0)).forEach(ch => {
            let glyph = this.glyphs.get(ch) ?? this.missingGlyph;

            if(glyph.outline !== undefined){
                ctx.fill(
                    ctx.importPath2D(glyph.outline, [SCALE, 0, 0, -SCALE, x, y + SCALE * MIDDLE_Y])
                );
            }

            x += SCALE * (glyph.horizAdvX ?? this.properties.horizAdvX);
        });
    }

    public measureText(text: string, fontSize: number): {width: number}{
        const SCALE = fontSize / this.properties.unitsPerEm;
        return {
            width: text.split("").reduce((a,b) => {
                return a + ((this.glyphs.get(b.charCodeAt(0)) ?? this.missingGlyph).horizAdvX ?? this.properties.horizAdvX)
            }, 0) * SCALE
        };
    }
}
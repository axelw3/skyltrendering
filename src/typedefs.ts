export type MathEnv = { [key: string]: number};

export type Vec2 = [number, number];
export type Vec4 = [number, number, number, number];
export type Vec5 = [number, number, number, number, number];
export type Vec6 = [number, number, number, number, number, number];

export type AlignModeX = "left" | "center" | "right";
export type AlignModeY = "top" | "middle" | "bottom";

type NodeAnchorX = AlignModeX | "center-first" | "center-last";
type NodeAnchorY = AlignModeY | "middle-first" | "middle-last";

export type TextBaseline = "top" | "middle" | "bottom" | "alphabetic" | "hanging" | "ideographic";

/**
 * Designer sparas i "nedre kant"-form, dvs.
 * orienterade på motsvarande sätt som klammern
 * i skylt F9 (samlingsmärke för vägvisning).
 */
export type BorderFeatureDefinition = {
    vars?: string[][];
    paths: {p: string, f?: number | string, s?: number | string}[];
    w?: number;
    h?: number | string;
    clip?: boolean;
};

type SignTypeDefinition = {
    nodes: {
        [key: string]: {
            x: number[];
            y: number[];
            ax?: NodeAnchorX;
            ay?: NodeAnchorY;
        }
    };
    width: number;
    height: number;
    core: number[];
};

type SignSymbolDefinition = {
    width: number;
    height: Vec2;
    default?: string;
};

export type NumNullOptArr = (number | null)[] | number | null;

// properties som ärvs (måste därför specificeras av rootDefaults)
export type SignElementBaseProperties = {
    background: string;
    borderRadius: NumNullOptArr;
    color: string;
    font: string;
    fontSize: number;
    lineHeight: number;
    lineSpacing: number;
};

// properties (utöver de i SignElementBaseProperties) som alltid måste finnas
// dessa måste alltså specificeras av globalDefaults
export type SignElementRequiredProperties = {
    borderFeatures: {left?: string, top?: string, right?: string, bottom?: string, overlay?: string};
    borderWidth: NumNullOptArr;
    padding: NumNullOptArr;
    xSpacing: number;
};

// properties som inte alltid finns i this.properties (dvs. aldrig obligatoriska)
type SignElementOptionalProperties = {
    alignContents: AlignModeX;
    alignContentsV: AlignModeY;
    blockDisplay: boolean;
    borderDash: boolean | Vec2;
    columns: number[];
    cover: boolean;
    dashedInset: boolean;
    dashedInsetR: NumNullOptArr;
    dashedInsetW: NumNullOptArr;
    fillCorners: boolean;
    grow: boolean;
    maxHeight: number; // symbol
    passAnchor: boolean;
    scale: number;
    size: number; // symbol
    type: string; // symbol
    value: string; // text, vagnr
    variant: string; // symbol
};

// properties som kan specificeras av användaren (inga är obligatoriska)
export type SignElementUserProperties = Partial<SignElementBaseProperties & SignElementRequiredProperties & SignElementOptionalProperties>;

export type SignElementDimProperties = {
    borderRadius: Vec4;
    borderWidth: Vec5;
};

// formatet som this.properties följer
export interface SignElementProperties extends SignElementBaseProperties, SignElementRequiredProperties, Partial<SignElementOptionalProperties>{
    borderRadius: Vec4;
    borderWidth: Vec5;
    padding: Vec4;
};

export type SignElementAnchor = {
    x?: NodeAnchorX;
    y?: NodeAnchorY;
};

export type SignElementNode = {
    anchor?: SignElementAnchor;
    data: SignElementOptions;
};

export const BASETYPES = {
    SKYLT: "skylt",
    TEXT: "text",
    VAGNR: "vagnr",
    NEWLINE: "newline",
    SYMBOL: "symbol",
    GROUP: "group",
    MALL: ".mall",
    MAKRO: "#makro"
} as const;

export type SignElementBaseType = (typeof BASETYPES)[keyof typeof BASETYPES];
export type SignElementType = SignElementBaseType | `.${string}` | `#${string}`;

// data som ges av användaren
export type SignElementOptions = {
    type: SignElementType;
    properties?: SignElementUserProperties;
    elements?: SignElementOptions[];
    nodes?: {[key: string]: SignElementNode};
    params?: any[];
}

export type ConfigData = {
    globalDefaults: SignElementUserProperties & SignElementRequiredProperties;
    rootDefaults: SignElementBaseProperties & SignElementUserProperties;
    defaults: {[key in SignElementBaseType]?: SignElementUserProperties};

    // standard-streckarray
    defaultLineDash: Vec2;

    // Skylttyper ("symboler med noder")
    signTypes: {
        [key: string]: SignTypeDefinition;
    },

    // Symboldefinitioner
    symbols: {
        [key: string]: SignSymbolDefinition;
    },

    // Kantdekorationer
    borderFeatures: {
        [key: string]: BorderFeatureDefinition;
    },

    // "Dynamiska" mallar (funktioner "parametrar => skyltkonfiguration")
    templates: {
        [key: string]: (...args: any[]) => SignElementOptions;
    }
};

export type UserConfigData = Partial<ConfigData>;

export type RenderingResult<C> = {
    flc: Vec4;
    minInnerWidth: number;
    minInnerHeight: number;
    bs: Vec4;
    properties: SignElementProperties;
    doRender: (ctx: NewDrawingArea<C>, x0: number, y0: number, verticalAlign?: AlignModeY, maxInnerWidth?: number, maxInnerHeight?: number, rowInnerElHeight?: number) => Promise<void>;
};

export type RenderingResultOpt<C> = {
    isn: boolean;
    r: RenderingResult<C>;
    row: number;
    w: number;
    ls: number;
};

export interface Path2DImmutable{};

export interface Path2D{
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise: boolean): void;
    closePath(): void;
};

type JSONVecElement = {path: string, fill: string};
export type JSONVecReference = {use: number, translate?: [number, number]};

export type JSONVec = {
    vectorSize: [number, number];
    defs: JSONVecElement[];
    core?: JSONVecReference[];
    components?: {[key: string]: JSONVecReference[]};
};

export interface NewDrawingArea<T>{
    canv: T;

    createPath2D(): Path2D;
    importPath2D(s: string, m?: Vec6): Path2DImmutable;

    set fillStyle(x: string);
    set strokeStyle(x: string);
    set lineWidth(x: number);

    set font(x: string);
    set textBaseline(x: TextBaseline);

    fill(path: Path2D | Path2DImmutable): void;
    stroke(path: Path2D | Path2DImmutable): void;

    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;

    drawImage(image: NewDrawingArea<T>, dx: number, dy: number): void;
};

export type CanvasFactory<C> = (w?: number, h?: number) => NewDrawingArea<C>;
export type MathEnv = { [key: string]: number};

export type Vec2 = [number, number];
export type Vec4 = [number, number, number, number];

type BorderFeatureDefinition = {
    vars?: string[][];
    paths: {p: string, f?: number, s?: number}[];
    w: number;
    h: number | string;
    cover: boolean;
};

type SignTypeDefinition = {
    nodes: {
        [key: string]: {
            x: number[];
            y: number[];
            ax?: string;
            ay?: string;
        }
    };
    width: number;
    height: number;
    core: number[];
};

type SignSymbolDefinition = {
    width: number;
    height: number[];
    default: string;
};

export type ConfigData = {
    properties: {
        globalDefaults: SignElementUserProperties;
        rootDefaults: SignElementBaseProperties & SignElementUserProperties;
        defaults: {[key: string]: SignElementUserProperties};
    },
    signTypes: {
        [key: string]: SignTypeDefinition
    },
    symbols: {
        [key: string]: SignSymbolDefinition
    },
    borderFeatures: {
        [key: string]: BorderFeatureDefinition
    },
    templates: {
        [key: string]: (...args: any[]) => SignElementOptions
    }
};

export type RenderingResult = {
    flc: Vec4;
    w: number;
    h: number;
    bs: Vec4;
    doRender: (ctx: DrawingContext, x0: number, y0: number, dx: number, prop: any, maxInnerHeight: number, verticalAlign?: string, iw?: number) => Promise<void>;
};

// properties som ärvs
export type SignElementBaseProperties = {
    background: string;
    borderRadius: number[] | number;
    color: string;
    font: string;
    lineHeight: number;
    lineSpacing: number;
    xSpacing: number;
};

type SignElementOptionalUserProperties = {
    alignContents?: string;
    alignContentsV?: string;
    blockDisplay?: boolean;
    dashedInset?: boolean;
    fillCorners?: boolean;
    grow?: boolean;
    passAnchor?: boolean;
    type?: string; // symbol
    value?: string; // text, vagnr
    variant?: string; // symbol

    borderFeatures?: {[key: string]: string};
    borderWidth?: number[] | number;
    padding?: number[] | number;
}

type SignElementUserProperties = Partial<SignElementBaseProperties> & SignElementOptionalUserProperties;

// formatet som this.properties följer
export interface SignElementProperties extends SignElementOptionalUserProperties, SignElementBaseProperties{
    borderFeatures: {[key: string]: string};
    borderRadius: Vec4;
    borderWidth: Vec4;
    padding: Vec4;
};

type SignElementNode = {
    anchor: {
        x?: string;
        y?: string;
    };
    data: SignElementOptions;
};

// data som ges av användaren
export type SignElementOptions = {
    format?: number;
    type: string;
    properties?: any;
    elements?: SignElementOptions[];
    nodes?: {[key: string]: SignElementNode};
    params?: any[];
}

export interface GenericDrawingContext{
    transform(a: number, b: number, c: number, d: number, e: number, f: number): void;

    measureText(text: string): {width: number};

    set fillStyle(x: string);
    set strokeStyle(x: string);
    set lineWidth(x: number);

    set font(x: string);
    set textBaseline(x: string);

    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise: boolean): void;

    fill(): void;
    fill(path: Path2D): void;
    stroke(path: Path2D): void;

    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;

    drawImage(image: CanvasImageSource, dx: number, dy: number): void;
    drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}

export type DrawingContext = CanvasRenderingContext2D | GenericDrawingContext;
export type MathEnv = { [key: string]: number};

export type Vec2 = [number, number];
export type Vec4 = [number, number, number, number];
export type Vec5 = [number, number, number, number, number];
export type Vec6 = [number, number, number, number, number, number];

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
    default?: string;
};

// properties som ärvs (måste därför specificeras av rootDefaults)
export type SignElementBaseProperties = {
    background: string;
    borderRadius: number[] | number;
    color: string;
    font: string;
    lineHeight: number;
    lineSpacing: number;
    xSpacing: number;
};

// properties (utöver de i SignElementBaseProperties) som alltid måste finnas
// dessa måste alltså specificeras av globalDefaults
type SignElementRequiredProperties = {
    borderFeatures: {[key: string]: string;};
    borderWidth: number[] | number;
    padding: number[] | number;
};

// properties som inte alltid finns i this.properties (dvs. aldrig obligatoriska)
type SignElementOptionalProperties = {
    alignContents: string;
    alignContentsV: string;
    blockDisplay: boolean;
    dashedInset: boolean;
    fillCorners: boolean;
    grow: boolean;
    passAnchor: boolean;
    type: string; // symbol
    value: string; // text, vagnr
    variant: string; // symbol
};

// properties som kan specificeras av användaren (inga är obligatoriska)
type SignElementUserProperties = Partial<SignElementBaseProperties & SignElementRequiredProperties & SignElementOptionalProperties>;

// formatet som this.properties följer
export interface SignElementProperties extends SignElementBaseProperties, SignElementRequiredProperties, Partial<SignElementOptionalProperties>{
    borderFeatures: {left?: string, top?: string, right?: string, bottom?: string, overlay?: string};
    borderRadius: Vec4;
    borderWidth: Vec5;
    padding: Vec4;
};

type SignElementAnchor = {
    x?: string;
    y?: string;
};

type SignElementNode = {
    anchor?: SignElementAnchor;
    data: SignElementOptions;
};

// data som ges av användaren
export type SignElementOptions = {
    format?: number; // not currently used
    type: string;
    properties?: SignElementUserProperties;
    elements?: SignElementOptions[];
    nodes?: {[key: string]: SignElementNode};
    params?: any[];
}

export type PropertiesDefaults = {
    globalDefaults: SignElementUserProperties & SignElementRequiredProperties;
    rootDefaults: SignElementBaseProperties & SignElementUserProperties;
    defaults: {[key: string]: SignElementUserProperties};
};

export type ConfigData = {
    // Olika standardegenskaper
    properties: PropertiesDefaults,

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

export type RenderingResult<C, T extends NewDrawingArea<C>> = {
    flc: Vec4;
    w: number;
    h: number;
    bs: Vec4;
    doRender: (ctx: T, x0: number, y0: number, dx: number, maxInnerHeight: number, verticalAlign?: string, iw?: number) => Promise<void>;
};

export interface Path2D{
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise: boolean): void;
    closePath(): void;
};

type JSONVecElement = {path: string, fill: string};
export type JSONVecReference = {use: number, translate?: [number, number]};

export type JSONVec = {
    width: number;
    height: number;
    vectorSize: [number, number];
    defs: JSONVecElement[];
    core?: JSONVecReference[];
    components?: {[key: string]: JSONVecReference[]};
};

export interface NewDrawingArea<T>{
    canv: T;

    createPath2D(s?: string, m?: Vec6): Path2D;

    measureText(text: string): {width: number};

    set fillStyle(x: string);
    set strokeStyle(x: string);
    set lineWidth(x: number);

    set font(x: string);
    set textBaseline(x: string);

    fill(path: Path2D): void;
    stroke(path: Path2D): void;
    clear(path: Path2D): void;

    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;

    drawImage(image: NewDrawingArea<T>, dx: number, dy: number): void;
};
import type { MathEnv } from "./typedefs.js";

export function mathEval(str: string | number, vars: MathEnv = {}): number{
    if(typeof str === "number") return str;

    let v = [0], operators = ["+"], tmp = "";

    let doOp = (a: number = 0, op: string = "+", b: number = 0): number => {
        switch(op){
            case "+":
                a += b;
                break;
            case "-":
                a -= b;
                break;
            case "*":
                a *= b;
                break;
            case "/":
                a /= b;
                break;
            case "sqrt":
                a = Math.sqrt(b);
                //console.log(a, b);
                break;
        }

        return a;
    };

    let c;
    for(let i = 0; i <= str.length; i++){
        switch(c = str.charAt(i) || "+"){
            case " ":
                continue;
            case "(":
                v.push(0);
                if(tmp.length > 0){
                    operators.push(tmp);
                    tmp = "";
                    break;
                }
                operators.push("+");
                break;
            case ")":
            case "*":
            case "/":
            case "+":
            case "-":
                let x0 = tmp.length > 0 ? doOp(v.pop(), operators.pop(), isNaN(parseFloat(tmp)) ? vars[tmp] : parseFloat(tmp)) : v.pop();
                tmp = "";

                if(c === ")"){
                    v[v.length - 1] = doOp(v[v.length - 1], operators.pop(), x0);
                    break;
                }

                v.push(x0 || 0);
                operators.push(c);
                break;
            default:
                tmp += c;
        }
    }

    return v[0];
}

export function parseVarStr(str: string, vars = {}): string{
    const EXPRESSION = new RegExp(/\$\{([^\{\}]+)\}/g);

    let result: string[] = [];

    let i = 0;
    while(true){
        let match = EXPRESSION.exec(str);

        if(match === null || EXPRESSION.lastIndex === 0) break;

        result.push(str.substring(i, match.index).concat(String(mathEval(match[1], vars))));

        i = match.index + match[0].length;
    }

    return result.join("") + str.substring(i);
}

export function getText(url: string): Promise<string>{
    return new Promise(resolve => {
        let req = new XMLHttpRequest();
        req.addEventListener("load", () => {
            resolve(req.responseText);
        });
        req.open("GET", url);
        req.send();
    });
}
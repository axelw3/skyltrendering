function mathEval(str = "", vars = {}){
    let values = [0], operators = ["+"], tmp = "";

    let doOp = (a, op, b) => {
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
                values.push(0);
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
                let x0 = tmp.length > 0 ? doOp(values.pop(), operators.pop(), isNaN(tmp) ? vars[tmp] : parseFloat(tmp)) : values.pop();
                tmp = "";

                if(c === ")"){
                    values[values.length - 1] = doOp(values[values.length - 1], operators.pop(), x0);
                    break;
                }

                values.push(x0);
                operators.push(c);
                break;
            default:
                tmp += c;
        }
    }

    return values[0];
}

function parseVarStr(str, vars = {}){
    const EXPRESSION = new RegExp(/\$\{([^\{\}]+)\}/g);

    let result = [];

    let i = 0;
    while(true){
        let match = EXPRESSION.exec(str);

        if(match === null || EXPRESSION.lastIndex === 0) break;

        result.push(str.substring(i, match.index).concat(String(mathEval(match[1], vars))));

        i = match.index + match[0].length;
    }

    return result.join("") + str.substring(i);
}
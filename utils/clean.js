(function(){
    const fs = require('fs');

    function rmFile(path){
        console.log("rm " + path);
        fs.rmSync(path);
    }

    process.argv.slice(2).map(x => {
        let s = fs.statSync(x, {throwIfNoEntry: false});
        if(s === undefined) return;

        if(s.isDirectory()){
            fs.readdirSync(x, {recursive: false, withFileTypes: true}).filter(y => y.isFile()).map(y => rmFile(x + y.name));
        }else{
            rmFile(x);
        }
    });

    process.exit(0);
})();
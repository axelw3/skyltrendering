(function(){
    const fs = require('fs');

    function rmFile(path){
        console.log("rm " + path);
        fs.rmSync(path);
    }

    function rmDirectory(path, rmSelf = true){
        fs.readdirSync(path, {recursive: false, withFileTypes: true}).map(y => {
            if(y.isFile()){
                rmFile(path + y.name);
            }else if(y.isDirectory()){
                rmDirectory(path + y.name + "/");
            }
        });

        if(!rmSelf) return;

        console.log("rmdir " + path);
        fs.rmdirSync(path);
    }

    process.argv.slice(2).map(x => {
        if(x.endsWith("/")){
            rmDirectory(x, false);
        }else{
            rmFile(x);
        }
    });

    process.exit(0);
})();
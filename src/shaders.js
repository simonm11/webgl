loadShaders.base = "shaders/";

function loadShaders(gl, shaders, callback) {
   
    function onreadystatechange() {
        var
            xhr = this,
            i = xhr.i
        ;
        if (xhr.readyState == 4) {
            shaders[i] = gl.createShader(
                shaders[i].substr(shaders[i].lastIndexOf('.') + 1) == "frag" ?
                    gl.FRAGMENT_SHADER :
                    gl.VERTEX_SHADER
            );
            gl.shaderSource(shaders[i], xhr.responseText);
            gl.compileShader(shaders[i]);
            if (!gl.getShaderParameter(shaders[i], gl.COMPILE_STATUS))
                alert(shaders[i] + " " + gl.getShaderInfoLog(shaders[i]))
            ;
            !--length && typeof callback == "function" && callback(shaders);
        }
    }
    for (var
        shaders = [].concat(shaders),
        asynchronous = !!callback,
        i = shaders.length,
        length = i,
        xhr;
        i--;
    ) {
        (xhr = new XMLHttpRequest).i = i;
        xhr.open("get", loadShaders.base + shaders[i] + "?timestamp=" + new Date().getTime(), asynchronous);
        if (asynchronous) {
            xhr.onreadystatechange = onreadystatechange;
        }

        xhr.send(null);
        onreadystatechange.call(xhr);
    }
    return shaders;
}

function setAttributes (gl, aNames, progArray) {
    for(var i = 0; i < aNames.length; i++) {
        progArray[aNames[i]] = gl.getAttribLocation(progArray, aNames[i]);
    }
}

function setUniforms (gl, uNames, progArray) {
    for(var i = 0; i < uNames.length; i++) {
        progArray[uNames[i]] = gl.getUniformLocation(progArray, uNames[i]);
    }
}

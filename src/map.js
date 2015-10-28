var Map = function(_engine) {
    
    // reference to engine
    this.engine = _engine;
    
    // rendering mode (gpu or cpu)
    this.renderingMode = 'gpu';
    
    // lod properties (for gpu mode)
    this.lod = true;

    // number of lod levels
    this.lodLevels = 3;

    // size of each level
    this.levelSize = 257;

    // how many time each level is split
    this.split = 2;
    
    this.lights = {};
    this.size = {};
    
    this.heightScaleMeters = 10.0;// * 100.0;
    this.heightScale = this.heightScaleMeters / this.engine.unitToMeter;
    
    this.sizeInMeters = 100.0;// * 50.0;
    this.sizeInUnits = this.sizeInMeters / this.engine.unitToMeter;

    this.waterLevel = 0.2; // 50% of the map is under water
    
    this.blockScale = 0;
    
    this.heightMap = [];
    this.heightMap2 = [];
    
    this.heightMapT = undefined;
    
    this.bitSize = 0;
    
    
    this.grids = [];
    this.gridsTrans = [];
    this.gridsLine = [];
    
    this.gridTransitionLines = [];
    this.gridTransitionLines2 = [];
    
    this.nbVertexes = 0;
    this.nbVertexesRendered = 0;
    
    this.gridSystem = [];
    
    this.useChunk = undefined;
    
    // Buffers for GPU mode
    this.heightMapTexture = undefined;
    
    // Buffers for CPU mode
    this.positionBuffer = undefined;
    this.indexesBuffer = undefined;
    this.normalBuffer = undefined;
    this.uvBuffer = undefined;
    this.tangentBuffer = undefined;
    
    // webgl buffers
    this.buffers = [];

    
};


/**
 *   Render terrain using GPU displacement
 */
Map.prototype.renderLodGPU = function(prog, mode) {

    var gl = this.engine.gl;
    var textures = this.engine.textures;
    
    //var prog = this.engine.shaderPrograms['terrainGPU'];
    
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures['ground']);
    gl.uniform1i(prog['uSamplerGround'], 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures['groundNormal']);
    gl.uniform1i(prog['uSamplerGroundNormal'], 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1']);
    gl.uniform1i(prog['uSamplerLayer1'], 2);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1Normal']);
    gl.uniform1i(prog['uSamplerLayer1Normal'], 3);
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
    gl.uniform1i(prog['uSamplerRock'], 4);
    
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
    gl.uniform1i(prog['uSamplerRockNormal'], 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, textures['map1texture']);
    gl.uniform1i(prog['uMap1Texture'], 6);
    
    /*
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
      gl.uniform1i(prog['uSamplerRock'], 6);
      
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
      gl.uniform1i(prog['uSamplerRockNormal'], 7);
    */
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth0'].texture);
    gl.uniform1i(prog['uDepthMaps[0]'], 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth1'].texture);
    gl.uniform1i(prog['uDepthMaps[1]'], 9);

    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth2'].texture);
    gl.uniform1i(prog['uDepthMaps[2]'], 10);

    gl.activeTexture(gl.TEXTURE11);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth3'].texture);
    gl.uniform1i(prog['uDepthMaps[3]'], 11);

    gl.activeTexture(gl.TEXTURE12);
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);
    gl.uniform1i(prog['uHeightMap'], 12);
    
    gl.activeTexture(gl.TEXTURE13);
    gl.bindTexture(gl.TEXTURE_2D, textures['noise']);
    gl.uniform1i(prog['uNoise'], 13);
    
    
    this.engine.setMatrixUniforms(prog);

    if ( mode == gl.LINES || mode == gl.LINE_STRIP ) {
        gl.uniform1f(prog.uMode, 1);
    } else {
        gl.uniform1f(prog.uMode, 2);
    }
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    
    // Global variables for whole terrain
    
    gl.uniform1f(prog.uUVScale, (this.sizeInMeters / 5.0));
    gl.uniform3f(prog.uAmbientColor, 0.13, 0.12, 0.1);

    var v = vec3.create(this.engine.lightDirection);
    v[2] = v[2] * -1.0;

    gl.uniform3fv(prog.uLightingDirection, v);
    gl.uniform3f(prog.uDirectionalColor, 1.0, 1.0, 1.0);
    gl.uniform1f(prog.uMapSize, this.sizeInUnits);
    gl.uniform1f(prog.uHeightScale, this.heightScale);
    gl.uniform1f(prog.uWaterLevel, this.waterLevel);
    //console.log($( "#snow-level" ).text());
    gl.uniform1f(prog.uSnowLevel, 100.0 - parseFloat($( "#label-snow-level" ).text()));

    this.nbVertexesRendered = 0;
    
    // Only move the terrain mesh in blockScale increment
    
    var camX = this.engine.cameraPos[0] + this.blockScale;
    var camZ = this.engine.cameraPos[2] + this.blockScale;
    
    camX -= camX % (this.blockScale * Math.pow(2, 2));
    camZ -= camZ % (this.blockScale * Math.pow(2, 2));
    
    // Half size of 1 Lod Level (in world units)   
    var centerOffset = this.blockScale * ( this.levelSize + ( this.levelSize / 2 ) );
    
    var prevPart = '';
    
    // Start rendering each part of the grid
    for ( var i = 0; i < this.gridTransitionLines2.length; i++ ) {
        
        var gridPart = this.gridTransitionLines2[i];
        var currentBuffer = this.gridsLine[gridPart.mesh];
        
        // Only bind buffer if the buffer is different
        if ( gridPart.mesh !== prevPart ) {
            
            prevPart = gridPart.mesh;
            
            gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffer.positions);
            gl.vertexAttribPointer(prog['aVertexPosition'], currentBuffer.positions.itemSize, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentBuffer.indexes);
            
        }
        
        // Position of the grid
        var translation = [camX + gridPart.position[0] - centerOffset,
                           0.0, 
                           camZ + gridPart.position[1] - centerOffset];
        
        // Only display the part if it is inside the map
        if ( this.isSquareInsideMap(gridPart.corners, [translation[0], translation[2]]) ) {
            
            gl.uniform3fv(prog.uTranslation, translation);
            
            gl.drawElements(mode, currentBuffer.indexes.numItems, gl.UNSIGNED_INT, 0);
            
        }
    }

    gl.disableVertexAttribArray(prog.aVertexPosition);

};

Map.prototype.isPointInsideMap = function(point, offset) {

    var size = this.size.w * this.blockScale;

    if ( (point[0] + offset[0]) > 0 && (point[0] + offset[0]) < size && (point[1] + offset[1]) > 0 && (point[1] + offset[1]) < size ) {
        return true;
    } else {
        return false;
    }
    
};

Map.prototype.isSquareInsideMap = function(square, offset) {
    
    for ( var i = 0; i < square.length; i++ ) {
        if ( this.isPointInsideMap(square[i], offset) ) {
            return true;
        }            
    }
    
    return false;
};

/**
 *   Add a new grid object to the list
 *
 *   @param {string} name of the grid buffer
 *   @param {array} x, y offset to position the grid when rendering
 */
Map.prototype.addGridObject = function(bufferName, offset, sizeW, sizeH) {

    // create calculate the 4 corners of the grid
    var corners = [];
    corners[0] = [0, 0];
    corners[1] = [sizeH, 0];
    corners[2] = [0, sizeW];
    corners[3] = [sizeH, sizeW];

    var o = {
        mesh: bufferName,
        position: offset,
        corners: corners
    };
    
    this.gridTransitionLines2.push(o);
};

Map.prototype.createLodGrid = function() {
    
    var vec2Dist = function(p1, p2) {
        return Math.max(
            Math.sqrt((p1[0] - p2[0])*(p1[0] - p2[0])), 
            Math.sqrt((p1[1] - p2[1])*(p1[1] - p2[1]))
        );
    };
    
    // Variables
    var i, j;
    
    // Const
    var NB_LEVELS = this.lodLevels;
    var LEVELS_SIZE = this.levelSize;
    var DIVISION = this.split;

    // Main square meshes
    for ( i = 0; i < NB_LEVELS; ++i ) {
        
        var levelMultiplier = Math.pow(2, i); // 1 2 4 8 16 ..
        var levelBlockSize = this.blockScale * levelMultiplier;
        var resolution = Math.ceil((LEVELS_SIZE) / levelMultiplier / DIVISION);
        
        // Create a new grid level
        this.gridsLine['g' + i] = new Grid();
        
        // Init mesh
        this.gridsLine['g' + i].initMesh(resolution, resolution, levelBlockSize, levelBlockSize, 1.0, 0);
        this.gridsLine['g' + i].createIndexes();
        this.gridsLine['g' + i].initWebglBuffer(this.engine.gl);
    }
    
    // Transition lines between two cube of the same LOD level
    for ( i = 0; i < NB_LEVELS - 1; ++i ) {
	
        var levelMultiplier = Math.pow(2, i + 1); // 2 4 8 16 ..
        
        var lengthLine = Math.ceil(LEVELS_SIZE / levelMultiplier);
        var blockScaleLine = this.blockScale * levelMultiplier;
        
        
        // Create one vertical and one horrizontal line
        
        this.gridsLine['l' + i + '-0'] = [];

        this.gridsLine['l' + i + '-0'] = new Grid();

        this.gridsLine['l' + i + '-0'].initMesh(lengthLine, 2, blockScaleLine, this.blockScale, 1.0, 0);
        this.gridsLine['l' + i + '-0'].createIndexes();
        this.gridsLine['l' + i + '-0'].initWebglBuffer(this.engine.gl);
        
        this.gridsLine['l' + i + '-1'] = new Grid();
        
        this.gridsLine['l' + i + '-1'].initMesh(2, lengthLine, this.blockScale, blockScaleLine, 1.0, 0);
        this.gridsLine['l' + i + '-1'].createIndexes();
        this.gridsLine['l' + i + '-1'].initWebglBuffer(this.engine.gl);

    }
    
    // Transition lines between two cube of different LOD level
    for ( i = 1; i < NB_LEVELS; ++i ) {
        
        var levelMultiplier = Math.pow(2, i - 1); // 2 4 8 16 ..
        
        var lengthLine = Math.ceil(LEVELS_SIZE / levelMultiplier);
        var blockScaleLine = this.blockScale * levelMultiplier;
        
        // Create 4 lines, one for each possible transition
        
        this.gridsLine['t' + i + '-0'] = new Grid();
        this.gridsLine['t' + i + '-0'].initMesh(lengthLine, 2, blockScaleLine, this.blockScale, 2.0, 1);
        this.gridsLine['t' + i + '-0'].createIndexes();
        this.gridsLine['t' + i + '-0'].initWebglBuffer(this.engine.gl);

        this.gridsLine['t' + i + '-1'] = new Grid();
        this.gridsLine['t' + i + '-1'].initMesh(2, lengthLine, this.blockScale, blockScaleLine, 2.0, 3);
        this.gridsLine['t' + i + '-1'].createIndexes();
        this.gridsLine['t' + i + '-1'].initWebglBuffer(this.engine.gl);

        this.gridsLine['t' + i + '-2'] = new Grid();
        this.gridsLine['t' + i + '-2'].initMesh(lengthLine, 2, blockScaleLine, this.blockScale, 2.0, 2);
        this.gridsLine['t' + i + '-2'].createIndexes();
        this.gridsLine['t' + i + '-2'].initWebglBuffer(this.engine.gl);

        this.gridsLine['t' + i + '-3'] = new Grid();
        this.gridsLine['t' + i + '-3'].initMesh(2, lengthLine, this.blockScale, blockScaleLine, 2.0, 4);
        this.gridsLine['t' + i + '-3'].createIndexes();
        this.gridsLine['t' + i + '-3'].initWebglBuffer(this.engine.gl);
    }
    
    // Single cube of size 1 (this.blockScale)
    
    this.gridsLine['cell'] = new Grid();
    this.gridsLine['cell'].initMesh(2, 2, this.blockScale, this.blockScale, 1.0, 0);
    this.gridsLine['cell'].createIndexes();
    this.gridsLine['cell'].initWebglBuffer(this.engine.gl);
    

    var lengthLevel = this.blockScale * LEVELS_SIZE;
    

    var mid = (NB_LEVELS - 1);
    
    // Positions of single cells
    for ( i = 0; i < (NB_LEVELS - 1) * 2; i++ ) {
        for ( j = 0; j < (NB_LEVELS - 1) * 2; j++) {
            
            var offset = [ lengthLevel + ((i + 1 - mid) * lengthLevel),
                           lengthLevel + ((j + 1 - mid) * lengthLevel)];
            
            var o = {
                mesh: 'cell',
                position: offset
            };
            

            this.addGridObject('cell', offset, this.blockScale, this.blockScale);
            //this.gridTransitionLines2.push(o);
        }
    }
    
    // Positions of transitions lines
    for ( var level = 0; level < NB_LEVELS - 1; ++level ) {  
        
        var X = (level * 2) + 1 ; // 1 3 5 7 ..
        
        for ( j = 0; j < X; j++ ) {
            
            var mid = Math.floor( X / 2 );
            var t = ((Math.floor(i / 2) % 2) * 2) - 1;
            
            var length = this.blockScale * LEVELS_SIZE;
            
            var offset1 = [ length - (length * level),
                            length + this.blockScale + ((j - mid)*length)];
            
            var o1 = {
                mesh: 't' + (level + 1) + '-0',
                position: offset1
            };
            
            this.addGridObject(o1.mesh, offset1, this.blockScale * (LEVELS_SIZE - 1), this.blockScale );
            
            var offset2 = [ length + this.blockScale + ((j - mid)*length),
                            length - (length * level)];
            
            var o2 = {
                mesh: 't' + (level + 1) + '-1',
                position: offset2
            };
            
            this.addGridObject(o2.mesh, offset2, this.blockScale, this.blockScale  * (LEVELS_SIZE - 1));            
            
            var offset3 = [ length + this.blockScale + ((j - mid)*length),
                            length + length + (length * level)];
            
            var o3 = {
                mesh: 't' + (level + 1) + '-3',
                position: offset3
            };
            
            this.addGridObject(o3.mesh, offset3, this.blockScale, this.blockScale * (LEVELS_SIZE - 1) );
            
            
            var offset4 = [ length + length + (length * level),
                            length + this.blockScale + ((j - mid)*length)];
            
            var o4 = {
                mesh: 't' + (level + 1) + '-2',
                position: offset4
            };
            
            this.addGridObject(o4.mesh, offset4, this.blockScale * (LEVELS_SIZE - 1), this.blockScale);
            
            
            //this.gridTransitionLines2.push(o1);
            //this.gridTransitionLines2.push(o2);
            //this.gridTransitionLines2.push(o3);
            //this.gridTransitionLines2.push(o4);
        }
    }

    
    // Position of separation lines
    for ( var level = 1; level < NB_LEVELS; ++level ) {  

        for ( i = 0; i < 4; ++i ) {
            for ( j = 0; j < level * 2; j++ ) {
                
                var length = this.blockScale * LEVELS_SIZE;
                var t = ((Math.floor(i / 2) % 2) * 2) - 1;
                var translation = [];
                var w, h;
                
                if ( (i%2) == 1 ) {
		    
                    translation =   [length + (t * length * level) + this.blockScale, 
                                     0.0, 
                                     length + (j - (level - 1)) * length];
                    
                    w = this.blockScale * (LEVELS_SIZE - 1);
                    h = this.blockScale;
                    
                } else {
                    translation =   [length + (j - (level - 1)) * length,
                                     0.0, 
                                     length + (t * length * level) + this.blockScale];
                    
                    h = this.blockScale * (LEVELS_SIZE - 1);
                    w = this.blockScale;
                }
		

                var o = {
                    mesh: 'l' + (level - 1) + '-' + (i % 2),
                    position: [translation[0], translation[2]]
                };
                
                this.addGridObject(o.mesh, o.position, h, w);
		
                //this.gridTransitionLines2.push(o);
            }
        }
    }
    
    // Create a grid system around the cameraPos
    var X = (NB_LEVELS * 2) - 1;
    var mid = (X - 1) / 2;
    
    for ( i = 0; i < X; i++ ) {
        for ( j = 0; j < X; j++ ) {
            
            for ( var divI = 0; divI < DIVISION; divI++ ) {
                for ( var divJ = 0; divJ < DIVISION; divJ++ ) {
                    
                    var d = vec2Dist([i, j], [mid, mid]);
                    

                    var o = {
                        mesh: 'g' + Math.floor(d),
                        position: [((i - mid + 1) * (LEVELS_SIZE) * this.blockScale) + this.blockScale + (divI*((LEVELS_SIZE - 1)/DIVISION) * this.blockScale), 
                                   ((j - mid + 1) * (LEVELS_SIZE) * this.blockScale) + this.blockScale + (divJ*((LEVELS_SIZE - 1)/DIVISION) * this.blockScale)]
                    };
                    
                    this.addGridObject(o.mesh, o.position, this.blockScale * (LEVELS_SIZE - 1)/DIVISION, this.blockScale * (LEVELS_SIZE - 1)/DIVISION);
		    
                    //this.gridTransitionLines2.push(o);
                }
            }
        }
    }        
    
};

Map.prototype.renderGridCorners = function() {

    var gl = this.engine.gl;
    
    var camX = this.engine.cameraPos[0] + this.blockScale;
    var camZ = this.engine.cameraPos[2] + this.blockScale;
    
    var diff = camX % (this.blockScale * Math.pow(2, 2));
    camX -= diff;
    
    diff = camZ % (this.blockScale * Math.pow(2, 2));
    camZ -= diff;
    
    var centerOffset = this.blockScale*(this.levelSize+this.levelSize/2);
    
    var points = [
        0.0, 0.0, 0.0,
        0.0, this.blockScale, 0.0    
    ];
    
    var indices = [
        0, 1
    ];
    
    var lines = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    var indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    var prog = this.engine.shaderPrograms['uniformColor'];
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    
    this.engine.setMatrixUniforms(prog);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    
    gl.uniform4fv(prog.uColor, [1.0, 1.0, 0.0, 1.0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    gl.vertexAttribPointer(prog['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    
    for ( var i = 0; i < this.gridTransitionLines2.length; i++ ) {
        
        var currentItem = this.gridTransitionLines2[i].mesh;
        var g = this.gridsLine[currentItem];
        

        var line = this.gridTransitionLines2[i];

        var translation = [camX + line.position[0] - centerOffset, 
                           camZ + line.position[1] - centerOffset];
        
        
        //var diff = time - new Date().getTime();
        
        //var translation = [-diff/10.0, 0.0, -diff/10.0];
        
        // send the position to the nearest multiple of this.blockScale
        /*
          var square = [];
          var s = this.blockScale * (this.levelSize / 4.0);
          
          square[0] = [translation[0], translation[2]];
          square[1] = [translation[0] + s, translation[2]];
          square[2] = [translation[0], translation[2] + s];
          square[3] = [translation[0] + s, translation[2] + s];
        */
	// if ( this.isSquareInsideMap(square) ) {

        
        for ( var j = 0; j < 4; j++ ) {
            
            if ( this.isSquareInsideMap(line.corners, translation) ) {
                gl.uniform4fv(prog.uColor, [1.0, 0.0, 0.0, 1.0]);
            } else {
                gl.uniform4fv(prog.uColor, [0.0, 1.0, 0.0, 1.0]);
            }
            
            //if ( line.corners !== undefined ) {
            
            var corner = line.corners[j];
            var translation2 = [];
            
            translation2[0] = translation[0] + corner[0];
            translation2[1] = -this.heightScale * 0.5;
            translation2[2] = translation[1] + corner[1];
            
            gl.uniform3fv(prog.uTranslation, translation2);
            gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);
            
            
            //}
            
        }
        
	// }
    }

    gl.disableVertexAttribArray(prog.aVertexPosition);


};

/**
 *   Download the heightMap
 *   @param {filename}
 *   @param {int} bit size (16 or 32 bits)
 *   @return {promise} jQuery promise once the file has been succefully downloaded
 */
Map.prototype.downloadHeightMap = function(file, bitSize) {
    
    var that = this;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', file, true);
    xhr.responseType = 'arraybuffer';    
    var d = jQuery.Deferred();
    
    xhr.onload = function(e) {
        that.heightMap = new Uint16Array(this.response);
        that.size.h = Math.sqrt(that.heightMap.length);
        that.size.w = Math.sqrt(that.heightMap.length);
        
        that.blockScale = that.sizeInUnits / that.size.h;
        
        console.log(that.blockScale + " aa " + that.size.h); 
        
        that.bitSize = bitSize;
        
        d.resolve();
    };
    
    xhr.send();
    
    return d.promise();
};

var SimplexNoise = function(r) {
    if (r == undefined) r = Math;
    this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0], 
                  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1], 
                  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]]; 
    this.p = [];
    for (var i=0; i<256; i++) {
	this.p[i] = Math.floor(r.random()*256);
    }
    // To remove the need for index wrapping, double the permutation table length 
    this.perm = []; 
    for(var i=0; i<512; i++) {
	this.perm[i]=this.p[i & 255];
    } 
    
    // A lookup table to traverse the simplex around a given point in 4D. 
    // Details can be found where this table is used, in the 4D noise method. 
    this.simplex = [ 
	[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0], 
	[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0], 
	[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
	[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0], 
	[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0], 
	[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
	[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0], 
	[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]; 
};

SimplexNoise.prototype.dot = function(g, x, y) { 
    return g[0]*x + g[1]*y;
};

SimplexNoise.prototype.noise = function(xin, yin) { 
    var n0, n1, n2; // Noise contributions from the three corners 
    // Skew the input space to determine which simplex cell we're in 
    var F2 = 0.5*(Math.sqrt(3.0)-1.0); 
    var s = (xin+yin)*F2; // Hairy factor for 2D 
    var i = Math.floor(xin+s); 
    var j = Math.floor(yin+s); 
    var G2 = (3.0-Math.sqrt(3.0))/6.0; 
    var t = (i+j)*G2; 
    var X0 = i-t; // Unskew the cell origin back to (x,y) space 
    var Y0 = j-t; 
    var x0 = xin-X0; // The x,y distances from the cell origin 
    var y0 = yin-Y0; 
    // For the 2D case, the simplex shape is an equilateral triangle. 
    // Determine which simplex we are in. 
    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords 
    if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1) 
    else {i1=0; j1=1;}      // upper triangle, YX order: (0,0)->(0,1)->(1,1) 
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
    // c = (3-sqrt(3))/6 
    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
    var y1 = y0 - j1 + G2; 
    var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords 
    var y2 = y0 - 1.0 + 2.0 * G2; 
    // Work out the hashed gradient indices of the three simplex corners 
    var ii = i & 255; 
    var jj = j & 255; 
    var gi0 = this.perm[ii+this.perm[jj]] % 12; 
    var gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12; 
    var gi2 = this.perm[ii+1+this.perm[jj+1]] % 12; 
    // Calculate the contribution from the three corners 
    var t0 = 0.5 - x0*x0-y0*y0; 
    if(t0<0) n0 = 0.0; 
    else { 
	t0 *= t0; 
	n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);  // (x,y) of grad3 used for 2D gradient 
    } 
    var t1 = 0.5 - x1*x1-y1*y1; 
    if(t1<0) n1 = 0.0; 
    else { 
	t1 *= t1; 
	n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); 
    }
    var t2 = 0.5 - x2*x2-y2*y2; 
    if(t2<0) n2 = 0.0; 
    else { 
	t2 *= t2; 
	n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); 
    } 
    // Add contributions from each corner to get the final noise value. 
    // The result is scaled to return values in the interval [-1,1]. 
    return 70.0 * (n0 + n1 + n2); 
};

/**
 *
 * Is used to storred an height map array into a texture
 * this is used when draw the terrain in GPU mode
 */
Map.prototype.randomHeightMap = function(height, width) {
    
    var gl = this.engine.gl;

    var sn = new SimplexNoise();

    var i, j;

    this.heightMap2 = new Float32Array(this.size.h * this.size.w * 4.0);

    for ( i = 0; i < this.size.w; ++i ) {
	for ( j = 0; j < this.size.h; ++j ) {

	    var x = i / 100.0;
	    var y = j / 100.0;
	    var val = (Math.cos(x) + Math.sin(y) * Math.cos(y * x * 10.0) / 10.0);
            // console.log((sn.noise(i, j) + 1.0) / 2.0);
            // Height Map
            this.heightMap2[(4 * ((i * this.size.w) + j)) + 0] = val;
	    this.heightMap2[(4 * ((i * this.size.w) + j)) + 1] = val;
	    this.heightMap2[(4 * ((i * this.size.w) + j)) + 2] = val;
	    this.heightMap2[(4 * ((i * this.size.w) + j)) + 3] = val;
            
	}
    }

    // texture that will be sent to the GPU
    this.heightMapT = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);   
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // floating point texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size.w, this.size.h, 0, gl.RGBA, gl.FLOAT, this.heightMap2);

    // no linear filtering
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
};

/**
 *
 * Is used to storred an height map array into a texture
 * this is used when draw the terrain in GPU mode
 */
Map.prototype.convertArray = function() {

    var gl = this.engine.gl;
    
    // var sn = new SimplexNoise();

    this.heightMap2 = new Float32Array(this.heightMap.length * 4.0);

    // store into heightMap2 the height value, the normal and the tangeant
    for ( i = 0; i < this.heightMap.length; ++i ) {
        
        // Height Map
        this.heightMap2[(4 * i) + 0] = this.heightMap[i] / (256.0 * 256.0);
        
        // Normal
        var x = ((this.normalBuffer[(3 * i) + 0] * 0.5) + 0.5) * 256.0;
        var y = ((this.normalBuffer[(3 * i) + 1] * 0.5) + 0.5) * 256.0;
        var z = ((this.normalBuffer[(3 * i) + 2] * 0.5) + 0.5) * 256.0;
        
        var fPackedNormal = (Math.floor(x) * 256.0 * 256.0) + (Math.floor(y) * 256) + Math.floor(z);

	// normal
        this.heightMap2[(4 * i) + 1] = fPackedNormal;
        
        // Tangents
        x = ((this.tangentBuffer[(3 * i) + 0] * 0.5) + 0.5) * 256.0;
        y = ((this.tangentBuffer[(3 * i) + 1] * 0.5) + 0.5) * 256.0;
        z = ((this.tangentBuffer[(3 * i) + 2] * 0.5) + 0.5) * 256.0;
        
        var fPackedTangent = (Math.floor(x) * 256.0 * 256.0) + (Math.floor(y) * 256) + Math.floor(z);

	// tangent
        this.heightMap2[(4 * i) + 2] = fPackedTangent;

	// ??
        this.heightMap2[(4 * i) + 3] = this.normalBuffer[(3 * i) + 2];
    }

    // texture that will be sent to the GPU
    this.heightMapT = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);   
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // floating point texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size.w, this.size.h, 0, gl.RGBA, gl.FLOAT, this.heightMap2);

    // no linear filtering
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
};

Map.prototype.getHeightAtCPU = function(x, z) {
    var realX = x / this.blockScale;
    var realZ = z / this.blockScale;
    
    var floorX = realX | 0;
    var floorZ = realZ | 0;
    var i;

    var index = (( floorZ * this.size.w ) + floorX);

    //top left y
    var v0 = this.positionBuffer[ (index * 3) + 1 ];
    //bottom right y
    var v3 = this.positionBuffer[ ((index + this.size.w + 1) * 3) + 1];
    //top right y
    var v1 = this.positionBuffer[ ((index + 1) * 3) + 1 ];
    //bottom left y
    var v2 = this.positionBuffer[ ((index + this.size.w) * 3) + 1 ];
    
    var percentX = realX - floorX;
    var percentZ = realZ - floorZ;
    
    //this.setY(x, z, 1.0);

    var l1, l2, l3, height;
    if(percentX > percentZ) {
	
	//top triangle
        l1 = 1 - percentX;
        l2 = percentX - percentZ;
        l3 = percentZ;

	height = (l1 * v0) + (l2 * v1) + (l3 * v3);
	
    } else {
	
	//bottom triangle
        l1 = 1 - percentZ;
        l2 = percentZ - percentX;
        l3 = percentX;
	
	height = (l1 * v0) + (l2 * v2) + (l3 * v3);
    }
    
    return height;
};

Map.prototype.getHeightAtGPU = function(x, z) {
    
    var realX = (x / this.blockScale) - 0.5;
    var realZ = this.size.h - ((z / this.blockScale) + 0.5);
    
    var floorX = realX | 0;
    var floorZ = realZ | 0;
    
    var index = (( floorZ * this.size.h ) + floorX);
    //var index = ((512.0 - floorZ)*((512.0))) + (floorX);
    
    //top left y
    var v0 = this.heightMap2[ (index * 4) ];
    //bottom right y
    var v3 = this.heightMap2[ ((index + this.size.h + 1) * 4) ];
    //top right y
    var v1 = this.heightMap2[ ((index + 1) * 4) ];
    //bottom left y
    var v2 = this.heightMap2[ ((index + this.size.h) * 4) ];
    
    var percentX = realX - floorX;
    var percentZ = realZ - floorZ;
    
    //this.setY(x, z, 1.0);

    var l1, l2, l3, height;
    if ( percentX > percentZ ) {
	
        //top triangle
        l1 = 1 - percentX;
        l2 = percentX - percentZ;
        l3 = percentZ;

        height = (l1 * v0) + (l2 * v1) + (l3 * v3);
	
    } else {
	
        //bottom triangle
        l1 = 1 - percentZ;
        l2 = percentZ - percentX;
        l3 = percentX;
	
        height = (l1 * v0) + (l2 * v2) + (l3 * v3);
    }
    
    // -0.2 to put stuff bellow 0 (water level)
    return ((height - this.waterLevel) * this.heightScale);    
};


/**
 *   Return the height Y based on the (x, z) position
 *
 *   @param {float} x position
 *   @param {float} z position
 */
Map.prototype.getHeightAt = function(x, z) {
    if ( this.renderingMode == "cpu" ) {
        return this.getHeightAtCPU(x, z);
    } else {
        return this.getHeightAtGPU(x, z);
    }
};

/**
 *   Create neccessary vertex buffers based on the heightMap
 *
 *   note: useless in GPU mode (I THINK)
 *   @return number of vertexes
 */
Map.prototype.generateVertexPosition = function() {

    // terrain size
    var width = this.size.w;
    var height = this.size.h;
    
    // Scaled map width and height
    var widthScale = (width - 1.0) * this.blockScale;
    var heightScale = (height - 1.0) * this.blockScale;
    
    var indexPosition = 0;
    var indexTexture = 0;
    
    this.positionBuffer = new Float32Array(height * width * 3);
    this.uvBuffer = new Float32Array(height * width * 2);
    
    // Generate vertex positions and UV positions
    for(var j = 0; j < height; ++j) {
        for(var i = 0; i < width; ++i) {
            
            // Current position of the vertex in the heigthMap
            var index = (j * width) + i;
            
            // Height of the vertex
            var heightValue = this.heightMap[index] / (Math.pow(2, this.bitSize) - 1);
            
            // Texture UV coordinates
            var U = (i / (width - 1));
            var V = (j / (height - 1));
            
            // Vertex position
            var X = (U * widthScale);
            var Y = ((heightValue - this.waterLevel) * this.heightScale);
            var Z = (V * heightScale);
            
            // Put this into the buffers
            this.positionBuffer[indexPosition++] = X;
            this.positionBuffer[indexPosition++] = Y;
            this.positionBuffer[indexPosition++] = Z;
            
            //  The map is this.sizeInMeters meters
            //  The size of a texture in meters is : 5.0
            //  Therefore, the uvs needs to be split in sizeInMeters / 5.0;
            this.uvBuffer[indexTexture++] = U * (this.sizeInMeters / 5.0);
            this.uvBuffer[indexTexture++] = V * (this.sizeInMeters / 5.0);
        }
    }
    
    return indexPosition;
};

/**
 *   Generate triangles indexes
 */
Map.prototype.generateIndexes = function() {

    // map size
    var width = this.size.w;
    var height = this.size.h;
    
    this.indexesBuffer = new Uint32Array((height - 1) * (width - 1) * 6);
    
    var index = 0;
    
    for (var j = 0; j < (height - 1); j++) {
	for (var i = 0; i < (width - 1); i++) {
	    
	    var iVertexIndex = (j * width) + i;

            // Top triangle
	    this.indexesBuffer[index++] = iVertexIndex;                     // V0
	    this.indexesBuffer[index++] = iVertexIndex + width + 1;         // V3
	    this.indexesBuffer[index++] = iVertexIndex + 1;                 // V1
	    // Bottom triangle
	    this.indexesBuffer[index++] = iVertexIndex;                     // V0
	    this.indexesBuffer[index++] = iVertexIndex + width;             // V2
	    this.indexesBuffer[index++] = iVertexIndex + width + 1;         // V3
	    
	}
    }

    return index;
};

function normalize(array, i) {

    var x = array[i], y = array[i + 1], z = array[i + 2];

    var len = Math.sqrt(x*x + y*y + z*z);
    
    if (len == 1) {
        return;
    }
    
    len = 1 / len;

    array[i]     = x * len;
    array[i + 1] = y * len;
    array[i + 2] = z * len;
}

/**
 *   Generate vertex Normals and tangents
 *   @todo shitty tangent calculation
 */
Map.prototype.generateNormals = function() {

    console.log("normals :: generateNormals : " + this.size.w + " " + this.size.h);

    // Initializing our temporary buffers

    var now, tmp;

    now = new Date().getTime();

    this.normalBuffer = new Float32Array(this.size.w * this.size.h *3);
    this.tangentBuffer = new Float32Array(this.size.w * this.size.h *3);

    var i;

    for ( i = 0; i < this.size.w * this.size.h * 3; i++ ) {
        this.normalBuffer[i] = 0;
        this.tangentBuffer[i] = 0;
    }

    tmp = new Date().getTime() - now;    
    now = new Date().getTime();
    console.log("normals :: init : " + tmp + "ms");

    var sub1 = vec3.create();
    var sub2 = vec3.create();

    var v1_index, v2_index, v3_index;

    var normal = vec3.create();
    var tangent = vec3.create();

    var v0 = vec3.create();
    var v1 = vec3.create();
    var v2 = vec3.create();

    // For each triangle
    for ( i = 0; i < this.indexesBuffer.length; i += 3 ) {
	
        // index of each vertex variable in positionBuffer
        v1_index = this.indexesBuffer[i + 0];
        v2_index = this.indexesBuffer[i + 1];
        v3_index = this.indexesBuffer[i + 2];

        // get the vertices coordinates
	v0[0] = this.positionBuffer[(v1_index * 3) + 0];
	v0[1] = this.positionBuffer[(v1_index * 3) + 1];
	v0[2] = this.positionBuffer[(v1_index * 3) + 2];

	v1[0] = this.positionBuffer[(v2_index * 3) + 0];
	v1[1] = this.positionBuffer[(v2_index * 3) + 1];
	v1[2] = this.positionBuffer[(v2_index * 3) + 2];

	v2[0] = this.positionBuffer[(v3_index * 3) + 0];
	v2[1] = this.positionBuffer[(v3_index * 3) + 1];
	v2[2] = this.positionBuffer[(v3_index * 3) + 2];
	
        // calculate normal
        sub1[0] = v1[0] - v0[0];
        sub1[1] = v1[1] - v0[1];
        sub1[2] = v1[2] - v0[2];

        sub2[0] = v2[0] - v0[0];
        sub2[1] = v2[1] - v0[1];
        sub2[2] = v2[2] - v0[2];
        
        vec3.cross(sub1, sub2, normal);
        vec3.normalize(normal);
	
        // add the normal for each vertex of the triangle
        
        this.normalBuffer[(v1_index * 3) + 0] += normal[0];
        this.normalBuffer[(v1_index * 3) + 1] += normal[1];
        this.normalBuffer[(v1_index * 3) + 2] += normal[2];

        normalize(this.normalBuffer, v1_index * 3);

        this.normalBuffer[(v2_index * 3) + 0] += normal[0];
        this.normalBuffer[(v2_index * 3) + 1] += normal[1];
        this.normalBuffer[(v2_index * 3) + 2] += normal[2];

        normalize(this.normalBuffer, v2_index * 3);

        this.normalBuffer[(v3_index * 3) + 0] += normal[0];
        this.normalBuffer[(v3_index * 3) + 1] += normal[1];
        this.normalBuffer[(v3_index * 3) + 2] += normal[2];

        normalize(this.normalBuffer, v3_index * 3);
        
        // get triangle uv
        v0[0] = this.uvBuffer[(v1_index * 2) + 0];
	v0[1] = this.uvBuffer[(v1_index * 2) + 1];

	v1[0] = this.uvBuffer[(v2_index * 2) + 0];
	v1[1] = this.uvBuffer[(v2_index * 2) + 1];
	
	v2[0] = this.uvBuffer[(v3_index * 2) + 0];
	v2[1] = this.uvBuffer[(v3_index * 2) + 1];
        
        var deltaUV1 = [v1[0] - v0[0], v1[1] - v0[1]];
	var deltaUV2 = [v2[0] - v0[0], v2[1] - v0[1]];
        
        var r = 1.0 / ((deltaUV1[0] * deltaUV2[1]) - (deltaUV1[1] * deltaUV2[0]));
	
	//var tangent = vec3.create();
	tangent[0] = (deltaUV2[1] * sub1[0] - deltaUV1[1] * sub2[0]) * r;
	tangent[1] = (deltaUV2[1] * sub1[1] - deltaUV1[1] * sub2[1]) * r;
	tangent[2] = (deltaUV2[1] * sub1[2] - deltaUV1[1] * sub2[2]) * r;
	
	// Add tangent to tangentBuffer
	//vec3.add(tmp_tangentBuffer[ indexesBuffer[i + 0] ], tangent);
	//vec3.add(tmp_tangentBuffer[ indexesBuffer[i + 1] ], tangent);
	//vec3.add(tmp_tangentBuffer[ indexesBuffer[i + 2] ], tangent);

        this.tangentBuffer[(v1_index * 3) + 0] += tangent[0];
        this.tangentBuffer[(v1_index * 3) + 1] += tangent[1];
        this.tangentBuffer[(v1_index * 3) + 2] += tangent[2];

        normalize(this.tangentBuffer, v1_index * 3);

        this.tangentBuffer[(v2_index * 3) + 0] += tangent[0];
        this.tangentBuffer[(v2_index * 3) + 1] += tangent[1];
        this.tangentBuffer[(v2_index * 3) + 2] += tangent[2];

        normalize(this.tangentBuffer, v2_index * 3);

        this.tangentBuffer[(v3_index * 3) + 0] += tangent[0];
        this.tangentBuffer[(v3_index * 3) + 1] += tangent[1];
        this.tangentBuffer[(v3_index * 3) + 2] += tangent[2];

        normalize(this.tangentBuffer, v2_index * 3);
    }

    tmp = new Date().getTime() - now;    
    now = new Date().getTime();
    console.log("normals :: normals : " + tmp + "ms");

    return this.indexesBuffer.length;
};

/**
 *   Load buffers into the GPU memory
 */
Map.prototype.initBuffers = function() {

    var gl = this.engine.gl;
    
    this.buffers['chunk0'] = [];
    
    this.buffers['chunk0']['position'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk0']['position']);
    gl.bufferData(gl.ARRAY_BUFFER, this.positionBuffer, gl.STATIC_DRAW);
    this.buffers['chunk0']['position'].itemSize = 3;
    this.buffers['chunk0']['position'].numItems = this.size.h * this.size.w;

    this.buffers['chunk0']['normals'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk0']['normals']);
    gl.bufferData(gl.ARRAY_BUFFER, this.normalBuffer, gl.STATIC_DRAW);
    this.buffers['chunk0']['normals'].itemSize = 3;
    this.buffers['chunk0']['normals'].numItems = this.size.h * this.size.w;
    
    this.buffers['chunk0']['tangents'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk0']['tangents']);
    gl.bufferData(gl.ARRAY_BUFFER, this.tangentBuffer, gl.STATIC_DRAW);
    this.buffers['chunk0']['tangents'].itemSize = 3;
    this.buffers['chunk0']['tangents'].numItems = this.size.h * this.size.w;

    this.buffers['chunk0']['uv'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk0']['uv']);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvBuffer, gl.STATIC_DRAW);
    this.buffers['chunk0']['uv'].itemSize = 2;
    this.buffers['chunk0']['uv'].numItems = this.size.h * this.size.w;
    
    this.buffers['chunk0']['indexes'] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['chunk0']['indexes']);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexesBuffer, gl.STATIC_DRAW);
    this.buffers['chunk0']['indexes'].itemSize = 1;
    this.buffers['chunk0']['indexes'].numItems = (this.size.h - 1) * (this.size.w - 1) * 6;
};

function arraysub(array, val) {
    var newArray = new Uint16Array(array.length);

    for(var i = 0; i < array.length; i++) {
        newArray[i] = array[i] -  (array[0]);
    }
    
    return newArray;
}

/**
 *   Load buffers in chunk into the GPU memory
 *   @param {uint} number of chunk 
 */
Map.prototype.initBuffersChunk = function(nb) {

    var gl = this.engine.gl;

    if((this.size.h * this.size.w) > (1 << 16) - 1) {
        this.useChunk = true;
        

        //var nbChunk = (((this.size.h * this.size.w) / ((1 << 16) - 1)) | 0 ) + 1;
        var nbChunk = 26;
        var nbRowPerChunk = ((this.size.h / nbChunk) | 0) + 1;
        
	
	var from, to;

        for(var i = 0; i < nbChunk; ++i) {
            
            from = i*nbRowPerChunk;
            
            if(this.size.h > (i+1)*nbRowPerChunk) {
                to = (i+1)*(nbRowPerChunk);
                to += 1;
            }
            else {
                to = this.size.h;
            }
            
            
            var row = to - from;
            var chunkSize = this.size.w*row;
            
            var chunkSkip = this.size.w*from;
            var rowSkiped = from;

            this.buffers['chunk' + i] = [];

            this.buffers['chunk' + i]['position'] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk' + i]['position']);
            gl.bufferData(gl.ARRAY_BUFFER, this.positionBuffer.subarray(chunkSkip*3, (chunkSkip*3)+(chunkSize*3)), gl.STATIC_DRAW);
            this.buffers['chunk' + i]['position'].itemSize = 3;
            this.buffers['chunk' + i]['position'].numItems = chunkSize;
            
            this.buffers['chunk' + i]['normals'] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk' + i]['normals']);
            gl.bufferData(gl.ARRAY_BUFFER, this.normalBuffer.subarray(chunkSkip*3, (chunkSkip*3)+(chunkSize*3)), gl.STATIC_DRAW);
            this.buffers['chunk' + i]['normals'].itemSize = 3;
            this.buffers['chunk' + i]['normals'].numItems = chunkSize;
            
            this.buffers['chunk' + i]['tangents'] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk' + i]['tangents']);
            gl.bufferData(gl.ARRAY_BUFFER, this.tangentBuffer.subarray(chunkSkip*3, (chunkSkip*3)+(chunkSize*3)), gl.STATIC_DRAW);
            this.buffers['chunk' + i]['tangents'].itemSize = 3;
            this.buffers['chunk' + i]['tangents'].numItems = chunkSize;
            
            this.buffers['chunk' + i]['uv'] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk' + i]['uv']);
            gl.bufferData(gl.ARRAY_BUFFER, this.uvBuffer.subarray(chunkSkip*2, (chunkSkip*2)+(chunkSize)*2), gl.STATIC_DRAW);
            this.buffers['chunk' + i]['uv'].itemSize = 2;
            this.buffers['chunk' + i]['uv'].numItems = chunkSize;

            this.buffers['chunk' + i]['indexes'] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['chunk' + i]['indexes']);
            
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arraysub(this.indexesBuffer.subarray((chunkSkip-rowSkiped)*6, ((chunkSkip-rowSkiped)*6)+(chunkSize-row)*6)), gl.STATIC_DRAW);
            this.buffers['chunk' + i]['indexes'].itemSize = 1;
            this.buffers['chunk' + i]['indexes'].numItems = ((chunkSize-this.size.w)-(row-1))*6;
        }
    }
};

/**
 *  render the map
 *
 *  @param {shaderProgram} program used for the shader
 */
Map.prototype.render = function(prog) {
    var gl = this.engine.gl;
    
    if ( this.renderingMode == 'cpu' ) {

        gl.enableVertexAttribArray(prog.aVertexPosition);
        gl.enableVertexAttribArray(prog.aVertexNormal);
        gl.enableVertexAttribArray(prog.aTexturePosition);
        gl.enableVertexAttribArray(prog.aVertexTangent);
	
        this.renderCPU(prog);
        
        gl.disableVertexAttribArray(prog.aVertexPosition);
        gl.disableVertexAttribArray(prog.aVertexNormal);
        gl.disableVertexAttribArray(prog.aTexturePosition);
        gl.disableVertexAttribArray(prog.aVertexTangent);
        
    } else if ( this.lod === true ) {

	//TODO: streamline cpu, gpuLod and gpu mode.
	// some take a prog in parameter and this one do not
	
        this.renderLodGPU(prog, gl.TRIANGLES);
	
    } else {

	// This mode was only done for testing purposes. This provides mostly no
	// advantages compared to the other modes.
	// The number of vertexes sent to the GPU each frame is still the same as in
	// CPU mode, expect that the height values have not been calculated
	//
	// GPU rendering mode, we need :
	//     - a PLANE grid the size of the map (aVertexPosition)
	
        gl.enableVertexAttribArray(prog.aVertexPosition);

        this.renderGPU(prog);
        
        gl.disableVertexAttribArray(prog.aVertexPosition);
    }
};

/**
 * 
 */
Map.prototype.renderDepthMapGPU = function(split_id) {

    'use strict';

    var gl = this.engine.gl;
    var textures = this.engine.textures;
    
    var prog = this.engine.shaderPrograms['depthMapGPU'];
    
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);
    gl.uniform1i(prog['uHeightMap'], 0);

    if ( this.engine.cascadeLights[0] === undefined ) {
        this.engine.setMatrixUniforms(prog);
    } else {
        gl.uniformMatrix4fv(prog["uMVMatrix"], false, this.engine.cascadeLights[split_id].mvMatrix);
        gl.uniformMatrix4fv(prog["uPMatrix"], false, this.engine.cascadeLights[split_id].pMatrix);
    }

    gl.uniform1f(prog.uMode, 2);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    
    // Global variables for whole terrain
    
    gl.uniform1f(prog.uUVScale, (this.sizeInMeters / 5.0));
    gl.uniform3f(prog.uAmbientColor, 0.13, 0.12, 0.1);
    gl.uniform3fv(prog.uLightingDirection, this.engine.lightDirection);
    gl.uniform3f(prog.uDirectionalColor, 1.0, 1.0, 1.0);
    gl.uniform1f(prog.uMapSize, this.sizeInUnits);
    gl.uniform1f(prog.uHeightScale, this.heightScale);
    gl.uniform1f(prog.uWaterLevel, this.waterLevel);

    this.nbVertexesRendered = 0;
    
    // Only move the terrain mesh in blockScale increment
    
    var camX = this.engine.cameraPos[0] + this.blockScale;
    var camZ = this.engine.cameraPos[2] + this.blockScale;
    
    camX -= camX % (this.blockScale * Math.pow(2, 2));
    camZ -= camZ % (this.blockScale * Math.pow(2, 2));
    
    // Half size of 1 Lod Level (in world units)   
    var centerOffset = this.blockScale * ( this.levelSize + ( this.levelSize / 2 ) );
    
    var prevPart = '';
    
    // Start rendering each part of the grid
    for ( var i = 0; i < this.gridTransitionLines2.length; i++ ) {
        
        var gridPart = this.gridTransitionLines2[i];
        var currentBuffer = this.gridsLine[gridPart.mesh];
        
        // Only bind buffer if the buffer is different
        if ( gridPart.mesh !== prevPart ) {
            
            prevPart = gridPart.mesh;
            
            gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffer.positions);
            gl.vertexAttribPointer(prog['aVertexPosition'], currentBuffer.positions.itemSize, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentBuffer.indexes);
            
        }
        
        // Position of the grid
        var translation = [camX + gridPart.position[0] - centerOffset,
                           0.0, 
                           camZ + gridPart.position[1] - centerOffset];
        
        // Only display the part if it is inside the map
        if ( this.isSquareInsideMap(gridPart.corners, [translation[0], translation[2]]) ) {
            
            gl.uniform3fv(prog.uTranslation, translation);
            
            gl.drawElements(gl.TRIANGLES, currentBuffer.indexes.numItems, gl.UNSIGNED_INT, 0);
            
        }
    }

    gl.disableVertexAttribArray(prog.aVertexPosition);
    
};

/**
 *   Render Terrain using GPU displacement
 *
 *   Contrary to renderLodGPU, this function process the entire Terrain in only one
 *   draw call.
 *   @param {shaderProgram}
 */
Map.prototype.renderGPU = function(prog) {

    var gl = this.engine.gl;
    var textures = this.engine.textures;
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures['ground']);
    gl.uniform1i(prog['uSamplerGround'], 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures['groundNormal']);
    gl.uniform1i(prog['uSamplerGroundNormal'], 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1']);
    gl.uniform1i(prog['uSamplerLayer1'], 2);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1Normal']);
    gl.uniform1i(prog['uSamplerLayer1Normal'], 3);
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
    gl.uniform1i(prog['uSamplerRock'], 4);
    
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
    gl.uniform1i(prog['uSamplerRockNormal'], 5);
    
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
    gl.uniform1i(prog['uSamplerRock'], 6);
    
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
    gl.uniform1i(prog['uSamplerRockNormal'], 7);
    
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth0'].texture);
    gl.uniform1i(prog['uDepthMaps[0]'], 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth1'].texture);
    gl.uniform1i(prog['uDepthMaps[1]'], 9);

    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth2'].texture);
    gl.uniform1i(prog['uDepthMaps[2]'], 10);

    gl.activeTexture(gl.TEXTURE11);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth3'].texture);
    gl.uniform1i(prog['uDepthMaps[3]'], 11);
    
    gl.activeTexture(gl.TEXTURE12);
    gl.bindTexture(gl.TEXTURE_2D, textures['noise']);
    gl.uniform1i(prog['uNoise'], 12);

    gl.activeTexture(gl.TEXTURE13);
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);
    gl.uniform1i(prog['uHeightMap'], 13);
    
    gl.activeTexture(gl.TEXTURE14);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainNormals'].texture);
    gl.uniform1i(prog['uTerrainNormals'], 14);
    
    gl.activeTexture(gl.TEXTURE15);
    gl.bindTexture(gl.TEXTURE_2D, textures['grid']);
    gl.uniform1i(prog['uGrid'], 15);
    
    gl.uniform2f(prog.mouseIndexPositionUniform, 0, 0);
    gl.uniform1f(prog.uMapSize, this.sizeInUnits);
    gl.uniform1f(prog.uHeightScale, this.heightScale);
    gl.uniform1f(prog.uUVScale, (this.sizeInMeters / 5.0));
    gl.uniform1f(prog.uWaterLevel, this.waterLevel);
    
    var i = 0;

    // Draw the map chunk by chunk
    // This is done to bypass the 16 bits restriction by draw call
    while ( this.buffers['chunk'+i] != undefined ) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk'+i]['position']);
        gl.vertexAttribPointer(prog['aVertexPosition'], this.buffers['chunk'+i]['position'].itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['chunk'+i]['indexes']);
        
        if ( this.engine.ext['uintElementIndex'] ) {

	    gl.drawElements(gl.TRIANGLES, this.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_INT, 0);

	} else {
	    
            gl.drawElements(gl.TRIANGLES, this.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_SHORT, 0);

	}
        
        ++i;
    }
};

Map.prototype.renderCPU = function(prog) {

    var gl = this.engine.gl;
    var textures = this.engine.textures;
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures['ground']);
    gl.uniform1i(prog['uSamplerGround'], 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures['groundNormal']);
    gl.uniform1i(prog['uSamplerGroundNormal'], 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1']);
    gl.uniform1i(prog['uSamplerLayer1'], 2);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures['layer1Normal']);
    gl.uniform1i(prog['uSamplerLayer1Normal'], 3);
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
    gl.uniform1i(prog['uSamplerRock'], 4);
    
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
    gl.uniform1i(prog['uSamplerRockNormal'], 5);
    
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, textures['rock']);
    gl.uniform1i(prog['uSamplerRock'], 6);
    
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, textures['rockNormal']);
    gl.uniform1i(prog['uSamplerRockNormal'], 7);
    
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth0'].texture);
    gl.uniform1i(prog['uDepthMaps[0]'], 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth1'].texture);
    gl.uniform1i(prog['uDepthMaps[1]'], 9);

    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth2'].texture);
    gl.uniform1i(prog['uDepthMaps[2]'], 10);

    gl.activeTexture(gl.TEXTURE11);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainDepth3'].texture);
    gl.uniform1i(prog['uDepthMaps[3]'], 11);
    
    gl.activeTexture(gl.TEXTURE12);
    gl.bindTexture(gl.TEXTURE_2D, textures['noise']);
    gl.uniform1i(prog['uNoise'], 12);

    gl.activeTexture(gl.TEXTURE13);
    gl.bindTexture(gl.TEXTURE_2D, this.heightMapT);
    gl.uniform1i(prog['uHeightMap'], 13);
    
    gl.activeTexture(gl.TEXTURE14);
    gl.bindTexture(gl.TEXTURE_2D, this.engine.fbo['terrainNormals'].texture);
    gl.uniform1i(prog['uTerrainNormals'], 14);
    
    gl.uniform2f(prog.mouseIndexPositionUniform, 0, 0);

    var i = 0;
    while ( this.buffers['chunk' + i] != undefined ) {
	
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk'+i]['position']);
        gl.vertexAttribPointer(prog['aVertexPosition'], this.buffers['chunk'+i]['position'].itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk'+i]['normals']);
        gl.vertexAttribPointer(prog['aVertexNormal'], this.buffers['chunk'+i]['normals'].itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk'+i]['tangents']);
        gl.vertexAttribPointer(prog['aVertexTangent'], this.buffers['chunk'+i]['tangents'].itemSize, gl.FLOAT, false, 0, 0);
	
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['chunk'+i]['uv']);
        gl.vertexAttribPointer(prog['aTexturePosition'], this.buffers['chunk'+i]['uv'].itemSize, gl.FLOAT, false, 0, 0);
	
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['chunk'+i]['indexes']);
        
        if(this.engine.ext['uintElementIndex'])
            gl.drawElements(gl.TRIANGLES, this.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_INT, 0);
        else
            gl.drawElements(gl.TRIANGLES, this.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_SHORT, 0);
        
        ++i;
        
    }
};

Map.prototype.convertHeightMapToFloat = function(to, w, h) {
    
    'use strict';
    
    var gl = this.gl;
    
    if(to !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Set up the verticies and indices
    var quadVerts = [
            -1,  1,  0, 1,
            -1, -1,  0, 0,
        1,  1,  1, 1,

            -1, -1,  0, 0,
        1, -1,  1, 0,
        1,  1,  1, 1
    ];

    var quadVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
    
    gl.viewport(0, 0, w, h);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    gl.disable(gl.DEPTH_TEST);
    var prog = this.shaderPrograms['blur'];
    
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    //gl.enableVertexAttribArray(prog.aTexturePosition);
    gl.vertexAttribPointer(prog.aVertexPosition, 2, gl.FLOAT, false, 16, 0);
    //gl.vertexAttribPointer(prog.aTexturePosition, 2, gl.FLOAT, false, 16, 8);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(prog.uSample0, 0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);

    gl.uniform2fv(prog.uTextureSize, [(1/w), (1/h)]);
    gl.uniform1i(prog.uOrientation, orientation);
    gl.uniform1i(prog.uBlurAmount, 5);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.DEPTH_TEST);
    gl.disableVertexAttribArray(prog.aVertexPosition);
    gl.disableVertexAttribArray(prog.aTexturePosition);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 *   Cast a ray on the terrain
 */
Map.prototype.rayIntersect = function(translation, direction) {
    
    var MAX_Y = 0;
    var MIN_Y = -1.0 * this.heightScale * this.waterLevel;
    var MAX_DIST = 1500.0;
    var precision = 0.5;
    
    var x, y, z, real_y;
    
    for ( var i = 0; i < MAX_DIST; i += precision ) {
	
        x = translation[0] + i * direction[0];
        y = translation[1] + i * direction[1];
        z = translation[2] + i * direction[2];
	
	real_y = this.getHeightAt(x, z);
        
	if ( ( real_y > y ) || ( y < MIN_Y ) ) {
	    return i;
	}
    }

    return -1;
};

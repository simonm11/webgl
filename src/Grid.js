/**
*   Grid.js
*   Create a 2D mesh of a square grid with the appropriate webgl buffers.
*/
var Grid = function() {
    
    this.width = 0;
    this.height = 0;
    this.blockSizeW = 0;
    this.blockSizeH = 0;
    
    // JS buffers
    this.positionBuffer = undefined;
    this.indexesBuffer = undefined;
    
    // Webgl buffers
    this.positions = undefined;
    this.indexes = undefined;
};

/**
*   Initialize a rectangle grid mesh
*
*   @param {number} number of blocks width
*   @param {number} number of blocks height
*   @param {number} size of a block (width)
*   @param {number} size of a block (height)
*   @param {number} ??
*   @param {number} ??
*/
Grid.prototype.initMesh = function(width, height, blockSizeW, blockSizeH, ratio, direction) {
    //this.resolution = width;
    //this.blockSize = blockSizeW;
    
    this.width = width;
    this.height = height;
    this.blockSizeW = blockSizeW;
    this.blockSizeH = blockSizeH;
    
    // Alocate buffer array
    this.positionBuffer = new Float32Array(width * height * 3);

    var j, i, indexPosition = 0;
    
    for ( j = 0; j < height; ++j ) {
        for ( i = 0; i < width; ++i ) {
            
            var X, Z;
            
            // Transition from top to bottom
            if (direction == 1 && (j == 0) && (i % ratio) == 1 ) {
                X = blockSizeH * j;
                Z = blockSizeW * (i + 1);
            // Transition from bottom to top    
            } else if (direction == 2 && (j == height - 1) && (i % ratio) == 1 ) {
                X = blockSizeH * j;
                Z = blockSizeW * (i - 1);
            // Transition from right to left  
            } else if (direction == 3 && (i == 0) && (j % ratio) == 1 ) {
                X = blockSizeH * (j + 1);
                Z = blockSizeW * i;
            // Transition from left to right 
            } else if (direction == 4 && (i == width - 1) && (j % ratio) == 1 ) {
                X = blockSizeH * (j - 1);
                Z = blockSizeW * i;
            } else {
                X = blockSizeH * j;
                Z = blockSizeW * i;
            }
                       
            this.positionBuffer[indexPosition++] = X;
            this.positionBuffer[indexPosition++] = 0.0;
            this.positionBuffer[indexPosition++] = Z;

        }                
    }
    
    return (length * 2);
};

/**
*   Init index buffer
*/
Grid.prototype.createIndexes = function() {

    this.indexesBuffer = new Uint32Array((this.width - 1) * (this.height - 1) * 6);
    
    var index = 0, j = 0, i = 0;
    
    for ( j = 0; j < (this.height - 1); ++j ) {
        for ( i = 0; i < (this.width - 1); ++i ) {
        
            var iVertexIndex = (j * this.width) + i;
            
            // Top triangle
            this.indexesBuffer[index++] = iVertexIndex;                     
            this.indexesBuffer[index++] = iVertexIndex + this.width + 1;
            this.indexesBuffer[index++] = iVertexIndex + 1;
            
            // Bottom triangle
            this.indexesBuffer[index++] = iVertexIndex;   
            this.indexesBuffer[index++] = iVertexIndex + this.width;         
            this.indexesBuffer[index++] = iVertexIndex + this.width + 1;
        }
    }

    return index / 6;
};

/**
*   Create WebGl Buffers
*   @param {WebGlContext} webgl context
*/
Grid.prototype.initWebglBuffer = function(gl) {

    this.positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positions);
    gl.bufferData(gl.ARRAY_BUFFER, this.positionBuffer, gl.STATIC_DRAW);
    this.positions.itemSize = 3;
    this.positions.numItems = this.height * this.width;
    
    this.indexes = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexes);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexesBuffer, gl.STATIC_DRAW);
    this.indexes.itemSize = 1;
    this.indexes.numItems = (this.height - 1) * (this.width - 1) * 6;
    
    var err = gl.getError();
    
    if ( err ) {
        throw err;
    }
};



/**
*   GRID UNIT TESTING
*/

var GridTest = function() {
    this.res = [];
};

GridTest.prototype.get = function() {

    this.testSuite(1000, 1000);
    this.testSuite(150, 100);
    this.testSuite(100, 150);
    this.testSuite(2, 1);
    this.testSuite(165, 1548);
    this.testSuite(15, 16.4);
    
    return this.res;
};

GridTest.prototype.testSuite = function(resolution, blockSize) {

    var self = this;

    this.res.push(function(){return self.testInitMesh(resolution, blockSize);});
    this.res.push(function(){return self.testBlockSize(resolution, blockSize);});
    this.res.push(function(){return self.testTotalSize(resolution, blockSize);});
    this.res.push(function(){return self.testTransitionGrid(resolution, blockSize);});
};

GridTest.prototype.testInitMesh = function(resolution, blockSize) {

    var grid = new Grid();
    var res = grid.initMesh(resolution, blockSize);
    
    // Test number of points returned
    if ( res !== resolution * resolution ) {
        return new UTResult(
            'testInitMesh()',
            1,
            'res is equal to ' + res + ' but resolution is set to ' + (resolution * resolution)
        );
    }
    
    return new UTResult('testInitMesh()', 0, '');
};

GridTest.prototype.testBlockSize = function(resolution, blockSize) {
    var grid = new Grid();
    var res = grid.initMesh(resolution, blockSize);
    
    var i, deltaX, deltaY;
    
    // Test x
    for ( i = 0; i < resolution - 1; i++ ) {
        deltaX = grid.positionBuffer[(i + 1) * 3] - grid.positionBuffer[(i) * 3];
        
        
        if ( Math.round(deltaX*1000.0)/1000.0 !== Math.round(blockSize*1000.0)/1000.0 ) {

            return new UTResult(
                'testBlockSize()',
                1,
                'deltaX is equal to ' + deltaX + ' but blockSize is ' + blockSize
            );
        }
    }
    
    // Test y
    for ( i = 0; i < resolution - 1; i++ ) {
        deltaY = grid.positionBuffer[(resolution * (i + 1) * 3) + 2] - grid.positionBuffer[resolution * (i * 3) + 2];
        
        if ( Math.round(deltaY*1000.0)/1000.0 !== Math.round(blockSize*1000.0)/1000.0 ) {
            return (new UTResult(
                'testBlockSize()',
                2,
                'deltaY is equal to ' + deltaY + ' but blockSize is ' + blockSize
            ));
        }
    }
    
    return new UTResult('testBlockSize()', 0, '');
};

GridTest.prototype.testTotalSize = function(resolution, blockSize) {

    var grid = new Grid();
    var res = grid.initMesh(resolution, blockSize);

    var last = (resolution * resolution) - 1;
    var maxX = grid.positionBuffer[(last * 3)];
    var maxY = grid.positionBuffer[(last * 3) + 2];
    
    if ( Math.round(maxX*1000.0)/1000.0 !== Math.round((blockSize * (resolution - 1))*1000.0)/1000.0 ) {
        return (new UTResult(
            'testTotalSize()', 
            1,
            'maxX is equal to ' + maxX + ' and not ' + (blockSize * (resolution - 1))
        ));
    }
    
     if ( Math.round(maxY*1000.0)/1000.0 !== Math.round((blockSize * (resolution - 1))*1000.0)/1000.0 ) {
        return (new UTResult(
            'testTotalSize()',
            2,
            'maxY is equal to ' + maxY + ' and not ' + (blockSize * (resolution - 1))
        ));
    }
    
    return new UTResult('testTotalSize()', 0, '');
};

GridTest.prototype.testTransitionGrid = function(resolution, blockSize) {

    var grid = new Grid();
    var res = grid.initTransitionMesh(resolution, blockSize);
    res = grid.createTransitionIndexes();
    
    return new UTResult('testTransitionGrid()', 0, '');
};

/**
*   List of simple models like a cube or a line
*/
var SimpleModels = {

	getModel : function(name, s) {
	
		var model = {};
	
		if(name == 'line') {
		
			var vertices = [			
				1, 0, 0,
				-1, 0, 0,
			];
			
			vertices.numItems = 2;
			vertices.itemSize = 3;
			
			var indices = [
				0, 1
			];
			
			indices.numItems = 2;
			indices.itemSize = 1;
            
            var uv = [];
			
		} else if(name == 'cube') {
			
			var cubeSize = s / 2;
			
			var vertices = [

				-cubeSize, -cubeSize,  cubeSize,
				 cubeSize, -cubeSize,  cubeSize,
				 cubeSize,  cubeSize,  cubeSize,
				-cubeSize,  cubeSize,  cubeSize,

				-cubeSize, -cubeSize, -cubeSize,
				-cubeSize,  cubeSize, -cubeSize,
				 cubeSize,  cubeSize, -cubeSize,
				 cubeSize, -cubeSize, -cubeSize,

				-cubeSize,  cubeSize, -cubeSize,
				-cubeSize,  cubeSize,  cubeSize,
				 cubeSize,  cubeSize,  cubeSize,
				 cubeSize,  cubeSize, -cubeSize,

				-cubeSize, -cubeSize, -cubeSize,
				 cubeSize, -cubeSize, -cubeSize,
				 cubeSize, -cubeSize,  cubeSize,
				-cubeSize, -cubeSize,  cubeSize,

				 cubeSize, -cubeSize, -cubeSize,
				 cubeSize,  cubeSize, -cubeSize,
				 cubeSize,  cubeSize,  cubeSize,
				 cubeSize, -cubeSize,  cubeSize,

				-cubeSize, -cubeSize, -cubeSize,
				-cubeSize, -cubeSize,  cubeSize,
				-cubeSize,  cubeSize,  cubeSize,
				-cubeSize,  cubeSize, -cubeSize
			];

			vertices.itemSize = 3;
			vertices.numItems = 24;

			var indices = [
				0, 1, 2,      0, 2, 3,   
				4, 5, 6,      4, 6, 7,   
				8, 9, 10,     8, 10, 11, 
				12, 13, 14,   12, 14, 15,
				16, 17, 18,   16, 18, 19,
				20, 21, 22,   20, 22, 23 
			];

			indices.itemSize = 1;
			indices.numItems = 36;
            
            var uv = [];
		
		} else if(name == 'square') {
            var size = s;
            
            var vertices = [
                
                -size, 0, -size,
                -size, 0, size,
                 size, 0, -size,
                 size, 0, size
            ];
            
            vertices.itemSize = 3;
            vertices.numItems = 4;
            
            var indices = [
                0, 1, 2,      1, 2, 3
            ];
            
            indices.itemSize = 1;
            indices.numItems = 6;
            
            var uv = [
                0.0, 0.0,
                0.0, 1.0,
                1.0, 0.0,
                1.0, 1.0
            ];
            
            uv.itemSize = 2;
            uv.numItems = 4;

        } else if(name == 'grid') {
            model = SimpleModels.generateGrid(model, s);
            return model;
        }
		
		model = {
			vertices : vertices,
			indices : indices,
            uv : uv
		}
		
		return model;
	
	},
    
    generateGrid : function(model, s) {
        // terrain size
        var width = s;
        var height = s;
        
        var blockScale = 1.0;
        
        // Scaled map width and height
        var widthScale = (width - 1) * blockScale;
        var heightScale = (height - 1) * blockScale;
       
        var indexPosition = 0;
        var indexTexture = 0;
        
        model.positionBuffer = new Float32Array(height*width*3);
        model.uvBuffer = new Float32Array(height*width*2);
        
        // Generate vertex positions and UV positions
        for(var j = 0; j < height; ++j) {
            for(var i = 0; i < width; ++i) {
                
                // Current position of the vertex in the heigthMap
                index = (j * width) + i;
                
                // Texture UV coordinates
                var U = (i / (width - 1));
                var V = (j / (height - 1));
                
                // Vertex position
                var X = (U * widthScale);
                var Z = (V * heightScale);
                
                // Put this into the buffers
                model.positionBuffer[indexPosition++] = X;
                model.positionBuffer[indexPosition++] = 0.0;
                model.positionBuffer[indexPosition++] = Z;

                model.uvBuffer[indexTexture++] = U * 128;
                model.uvBuffer[indexTexture++] = V * 128;
            }
        }
        
        model = SimpleModels.generateIndexGrid(model, s);
        
        return model;
    },
    
    generateIndexGrid : function(model, s) {

        // map size
        var width = s;
        var height = s;
        
        model.indexesBuffer = new Uint32Array((height - 1) * (width - 1) * 6);
        
        var index = 0;
        
        for (var j = 0; j < (height - 1); j++) {
            for (var i = 0; i < (width - 1); i++) {
                
                var iVertexIndex = (j * width) + i;

                // Top triangle
                model.indexesBuffer[index++] = iVertexIndex;                     // V0
                model.indexesBuffer[index++] = iVertexIndex + width + 1;         // V3
                model.indexesBuffer[index++] = iVertexIndex + 1;                 // V1
                // Bottom triangle
                model.indexesBuffer[index++] = iVertexIndex;                     // V0
                model.indexesBuffer[index++] = iVertexIndex + width;             // V2
                model.indexesBuffer[index++] = iVertexIndex + width + 1;         // V3
                
            }
        }
        
        return model;
    }
};
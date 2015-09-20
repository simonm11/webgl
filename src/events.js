/**
*  Mouse Object
*/
var Mouse = function(_engine) {
    this.currentX = 0;
    this.currentY = 0;
    
    // Used to draw a selection box
    this.lastDownX = 0;
    this.lastDownY = 0;
    
    // position of the mouse projected on the terrain (in world units (?))
    this.mouseIndexPos = [];
    
    // reference to engine
    this.engine = _engine;

    var t; // ??
};

/**
*  When the mouse is moving 
*/
Mouse.prototype.move = function(e) {
    
    // Update current position of the mouse
    
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    
    // {TODO} don't have to do that everytime the mouse move, but whatever for now..
    this.mouseIndexPos = this.engine.unprojectOnTerrain(this.currentX, this.currentY);	
};

/**
*   Click up
*/
Mouse.prototype.up = function(e) {
    
    var that = this;
    var gl = this.engine.gl;
    
    // disable default events on left/right click
    e.preventDefault();
    
    // Left click
    if ( e.button == 0 ) {
    
        //clickDown = false;
        
        var topx, topy, bottomx, bottomy;
        
        if ( this.lastDownX < e.clientX ) {
            topx = this.lastDownX;
            bottomx = e.clientX;
        } else {
            topx = e.clientX;
            bottomx = this.lastDownX;
        }
        
        if ( this.lastDownY < e.clientY ) {
            topy = this.lastDownY;
            bottomy = e.clientY;
        } else {
            topy = e.clientY;
            bottomy = this.lastDownY;
        }
        
        // if we did a big enough rectangle 
        if(bottomx - topx > 10 && bottomy - topy > 10) {
            //player1.clearSelection();
            
            for(var i = topx; i < bottomx; i+=10) {
                for(var j = topy; j < bottomy; j+=10) {
                    var index = ((gl.viewportHeight - j)*((gl.viewportWidth)*4)) + (i * 4);
                    //if(colorMap[index] != 0) {
                    //var id = ((255 - colorMap[index]) + 1) + (254 * (255 - colorMap[index + 3]));
                    //if(id > 0) {
                    //	console.log(colorMap[index + 3]);
                    //	player1.addSelection(id);
                    //}
                    //}
                }
            }
        }
        
    }
    // Right Click
    else if(e.button == 2) {

    
        document.removeEventListener("mousemove", that.t, false);

        document.exitPointerLock =  document.exitPointerLock ||
                                    document.mozExitPointerLock ||
                                    document.webkitExitPointerLock;
                                    document.exitPointerLock();
    }
}

/**
*   On mouse click down
*/
Mouse.prototype.down = function(e) {
    
    var that = this;
    var gl = this.engine.gl;
    
    // prevent default behavior of left/right click
    e.preventDefault();
    
    var x = e.clientX;
    var y = e.clientY;
    
    this.lastDownX = x;
    this.lastDownY = y;
    
    // render scenePicking in order to click on units
    this.engine.renderScenePicking( this.engine.fbo['scenePicking'] );

    var index = ((gl.viewportHeight - y)*((gl.viewportWidth)*4)) + (x * 4);
    
    // Left Click
    if ( e.button == 0 ) {
	
        clickDown = true;
	
        if ( this.engine.colorMap[index] != 0 ) {
            
            var color = [this.engine.colorMap[index], this.engine.colorMap[index + 1], this.engine.colorMap[index + 2]];
            
            var id = this.engine.colorPickingToId(color);
            
            if ( id > 0 ) {
                if ( e.shiftKey ) {
                    
                    this.engine.me.addSelection(id);
                    
                } else {
                
                    this.engine.me.overideSelection(id);
                
                }
            }
            
        }
        else {
            this.engine.me.clearSelection();					
        }
    }
    // Right Click
    else if ( e.button == 2 ) {
        
        var objSelected = this.engine.me.selected;
        
        // if at least 1 object is currently selected
        if ( objSelected.length > 0 ) {
	
            // if shift, queue an action, otherwise overide every action
            var funcAction = e.shiftKey ? Obj.prototype.addAction : Obj.prototype.overideAction;
            
            // if we right clicked on another object, attack or follow
            if ( this.engine.colorMap[index] != 0 ) {
            
                var color = [this.engine.colorMap[index], this.engine.colorMap[index + 1], this.engine.colorMap[index + 2]];
            
                var id = this.engine.colorPickingToId(color);
                
                var target = this.engine.objs.o[id - 1];
                
                for ( var i = 0; i < objSelected.length; i++ ) {
                    
                    var source = this.engine.objs.o[objSelected[i] - 1];
                    
                    // if same player, follow, otherwise attack
                    if ( target.player == source.player ) {
                        funcAction.call(source, ACT.FOLLOW, id - 1);									
                    } else {
                        funcAction.call(source, ACT.ATK, id - 1);
                    }
                    
                }
	
            } 
            // move
            else {
                
                var mouseIndexPos = this.engine.unprojectOnTerrain(x, y);
                
                var pos = [mouseIndexPos[0], this.engine.map.getHeightAt(mouseIndexPos[0], mouseIndexPos[1]), mouseIndexPos[1]];
                
                // Move each object to this position
                for ( var i = 0; i < objSelected.length; i++ ) {
                
                    var source = this.engine.objs.o[objSelected[i] - 1];

                    funcAction.call(source, ACT.MOVE, pos);
                }
            }
        }
	
        that.t = function(e) { that.test(e); }

        document.addEventListener("mousemove", that.t, false);
        that.ptrLock($('#webgl-canvas')[0]);				
    }
};

Mouse.prototype.ptrLock = function(c) {
    c.requestPointerLock = 	c.requestPointerLock ||
	c.mozRequestPointerLock ||
	c.webkitRequestPointerLock;

    c.requestPointerLock();				
}

Mouse.prototype.test = function(e) {
    _movementX = e.movementX ||
      e.mozMovementX          ||
      e.webkitMovementX       ||
      0,
    _movementY = e.movementY ||
      e.mozMovementY      ||
      e.webkitMovementY   ||
      0;
    
    //console.log(this.engine.cameraYaw);
    this.engine.cameraYaw -= _movementX*0.2;
    this.engine.cameraPitch -= _movementY*0.2;
    
    this.engine.cameraLastUpdate = new Date().getTime();
}


/*
	Keyboard
*/

function Keyboard(_engine) {
    this.currentlyPressedKeys = {};
    
    this.engine = _engine;
}

Keyboard.prototype.handleKeyDown = function(event) {
    
    this.currentlyPressedKeys[event.keyCode] = true;
    
    if(event.keyCode == 71) {
	if(this.engine.gui.skyOptions == 0) {
	    this.engine.gui.skyOptions = 1;
	    $('#sky_box_param').css({
		'top':'20px'
	    });
	}
	else{
	    this.engine.gui.skyOptions = 0;
	    $('#sky_box_param').css({
		'top':'-2000px'
	    });
	}
    } else if(event.keyCode == 72) {
        this.engine.updateLight();
	//	myTerrain.generateNormals();
	//	myTerrain.initBuffers();
    } else if(event.keyCode == 73 && !a) {
	//	a = true;
	//	objs.add(2, 1, [100, myTerrain.getHeightAt(100, 100), 100], 1);
	//	objs.add(1, 1, [50, 50, 50], 1);
    }
};

Keyboard.prototype.handleKeyUp = function(event) {
	this.currentlyPressedKeys[event.keyCode] = false;
};

Keyboard.prototype.handleKeys = function() {
    /*  
	if (this.currentlyPressedKeys[70]) {

	var tmp_position = [8.0*((objs.nbTotal/25)|0), 50.0, 8*(objs.nbTotal%25)];

	objs.add(1, 1, tmp_position, ((currentPlayer++)%2)+1);
	}
    */

    if (this.currentlyPressedKeys[37] || this.currentlyPressedKeys[81]) {
	// Left cursor key or A
        this.engine.strafSpeed = 1.0 * this.engine.unitToMeter;
    } else if (this.currentlyPressedKeys[39] || this.currentlyPressedKeys[68]) {
	// Right cursor key or D
        this.engine.strafSpeed = -1.0 * this.engine.unitToMeter;
    } else {
        this.engine.strafSpeed = 0;
    }

    if (this.currentlyPressedKeys[38] || this.currentlyPressedKeys[90]) {
	// Up cursor key or W
        this.engine.speed = 1.0 * this.engine.unitToMeter;
    } else if (this.currentlyPressedKeys[40] || this.currentlyPressedKeys[83]) {
	// Down cursor key
        this.engine.speed = -1.0 * this.engine.unitToMeter;
    } else {
        this.engine.speed = 0;
    }
};




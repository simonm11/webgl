'use strict';

var ObjsManager = function(_engine, h, w) {

    this.engine = _engine;
	this.o = [];
	
	this.nbAlive = 0;
	this.nbTotal = 0;
	this.indexID = 0; //??
	
	var bounds = {
			x:0,
			y:0,
			width:(w - 1) * 4,
			height:(h - 1) * 4
	};
	
	this.quadtree = new Quadtree(bounds);
	
	this.selected = 0;
};


/*
ObjsManager.prototype.renderQuadTree = function() {

	var prog = "missile";

	gl.useProgram(shaderPrograms[prog]);
	gl.enableVertexAttribArray(shaderPrograms[prog].vertexPositionAttribute);

	setMatrixUniforms(shaderPrograms[prog]);

	this.renderQuadTreeNode(this.quadtree);
	this.renderQuadTreeContent(this.quadtree);
	
	gl.disableVertexAttribArray(shaderPrograms[prog].vertexPositionAttribute);
}
*/
/*
ObjsManager.prototype.renderQuadTreeContent = function(_node) {
	
	var prog = "missile";
	
	for(var i = 0; i < _node.objects.length; i++) {
		
		var objectSize = 8;
		var objectPosition = {x: _node.objects[i].x, y: _node.objects[i].y};
		
		gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
		gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVertexIndexBuffer);

		gl.uniform3f(shaderPrograms[prog].translationUniform, objectPosition.x, 50.0, objectPosition.y);
		gl.uniform4f(shaderPrograms[prog].colorUniform, 1.0, 0.0, 0.0, 1.0);

		gl.drawElements(gl.LINES, squareVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
	
	if(_node.nodes.length > 0) {
		for(var i = 0; i < _node.nodes.length; i++) {
			this.renderQuadTreeContent(_node.nodes[i]);
		}
	}
}
*/
/*
ObjsManager.prototype.renderQuadTreeNode = function(_node) {
	
	var prog = "missile";
	
	var bounds = _node.bounds;
	
	// draw 4 lines
	
	var topleft = 		{x: bounds.width + bounds.x, y: bounds.height + bounds.y};
	var topright = 		{x: 0 + bounds.x , y: bounds.height + bounds.y};
	var bottomleft = 	{x: bounds.width + bounds.x , y: 0 + bounds.y};
	var bottomright = 	{x: 0 + bounds.x , y :0 + bounds.y};
	
	var color = [];
	
	color[0] = 1.0;
	color[1] = 0.0;
	color[2] = 0.0;
	
	// Line 1
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers['line'].vertexPosition);
		
	LineVertices[0] = bottomleft.x;
	LineVertices[1] = 50.0;
	LineVertices[2] = bottomleft.y;
	LineVertices[3] = topleft.x
	LineVertices[4] = 50.0
	LineVertices[5] = topleft.y
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(LineVertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, buffers['line'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['line'].vertexIndex);
	
	gl.uniform3f(shaderPrograms[prog].translationUniform, 0.0, 0.0, 0.0);
	gl.uniform4f(shaderPrograms[prog].colorUniform, color[0], color[1], color[2], 1.0);
	
	gl.drawElements(gl.LINES, buffers['line'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
	
	// Line 2
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers['line'].vertexPosition);
		
	LineVertices[0] = topleft.x
	LineVertices[1] = 50.0
	LineVertices[2] = topleft.y
	LineVertices[3] = topright.x
	LineVertices[4] = 50.0
	LineVertices[5] = topright.y
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(LineVertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, buffers['line'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['line'].vertexIndex);
	
	gl.uniform3f(shaderPrograms[prog].translationUniform, 0.0, 0.0, 0.0);
	gl.uniform4f(shaderPrograms[prog].colorUniform, color[0], color[1], color[2], 1.0);
	
	gl.drawElements(gl.LINES, buffers['line'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
	
	// Line 3
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers['line'].vertexPosition);
		
	LineVertices[0] = topright.x
	LineVertices[1] = 50.0
	LineVertices[2] = topright.y
	LineVertices[3] = bottomright.x
	LineVertices[4] = 50.0
	LineVertices[5] = bottomright.y
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(LineVertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, buffers['line'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['line'].vertexIndex);
	
	gl.uniform3f(shaderPrograms[prog].translationUniform, 0.0, 0.0, 0.0);
	gl.uniform4f(shaderPrograms[prog].colorUniform, color[0], color[1], color[2], 1.0);
	
	gl.drawElements(gl.LINES, buffers['line'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
	
	// Line 4
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers['line'].vertexPosition);
		
	LineVertices[0] = bottomright.x
	LineVertices[1] = 50.0
	LineVertices[2] = bottomright.y
	LineVertices[3] = bottomleft.x
	LineVertices[4] = 50.0
	LineVertices[5] = bottomleft.y
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(LineVertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, buffers['line'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['line'].vertexIndex);
	
	gl.uniform3f(shaderPrograms[prog].translationUniform, 0.0, 0.0, 0.0);
	gl.uniform4f(shaderPrograms[prog].colorUniform, color[0], color[1], color[2], 1.0);
	
	gl.drawElements(gl.LINES, buffers['line'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);

	if(_node.nodes.length > 0) {
		for(var i = 0; i < _node.nodes.length; i++) {
			this.renderQuadTreeNode(_node.nodes[i]);
		}
	}
}
*/

/**
*   Remove every dead (hp < 0) object from the list
*/
ObjsManager.prototype.removeDead = function() {

	for ( var i = 0; i < this.nbTotal; i++ ) {
    
		if ( this.o[i].currentHP <= 0 ) {
			this.o[i].uniqueId = -1;
		}
	
    }
    
};

/**
*   Add a new object to the object manager
*
*   @param {number} type of object (building, unit, etc..)
*   @param {number} identification of the model of this object
*   @param {vec3}   current position of the object
*   @param {number} who this object belong to
*/
ObjsManager.prototype.add = function(_type, _modelId, _position, _player) {
    
    // increase size of the array if every object is alive
	if ( this.nbTotal == this.nbAlive ) {
    
		this.o.push( new Obj(_type, _modelId, _position, _player, this.indexID) );	
        
		this.nbTotal++;
		this.nbAlive++;
		this.indexID++;
     
	} else {
    
        // iterate though objects to find a dead one (uniqureId == -1)
		for ( var i = 0; i < this.nbTotal; i++ ) {
        
			if ( this.o[i].uniqueId == -1 ) {
            
				this.o[i].clear(_type, _modelId, _position, _player, this.indexID);
				
                this.nbAlive++;
				this.indexID++;
				
                break;
                
			}
            
		}
        
	}
    
};

/**
*   kill an object from the list
*   @param {number} index to remove
*/
ObjsManager.prototype.remove = function(_index) {

	this.o[_index].uniqueId = -1;
	this.nbAlive--;

};

/**
*   Create quadTree for unit collision
*/
ObjsManager.prototype.makeCollisionTree = function() {
	
	this.quadtree.clear();
	
	for ( var i = 0; i < this.o.length; i++ ) {
        
        // Only calculate collision for non-dead objects
		if ( this.o[i].uniqueId != -1 ) {
            
            var object = {
                x: this.o[i].position[0], 
                y: this.o[i].position[2],
                height: this.o[i].stats.size,
                width: this.o[i].stats.size,
                id: i           
            };
            
			this.quadtree.insert(object);
            
		}
        
	}

};

/**
*   Render every objects from the list (engine.objs)
*
*   @param {shaderProgram} shader program to use for the rendering
*   @param {number:enum} ??
*/
ObjsManager.prototype.render = function(prog, mode) {
	
    var color = [];
    var gl = this.engine.gl;
    
	if ( this.nbAlive > 0 ) {
        
		gl.enableVertexAttribArray(prog.aVertexPosition);
	
		gl.uniform1i(prog.uMode, mode);
		
        var currentModelId = -1;
        var currentModel = undefined;
        
		for ( var i = 0; i < this.nbTotal; i++ ) {
            
            var currentObject = this.o[i];
            
            // Display every non-dead objects
			if ( currentObject.uniqueId != -1 ) {
            
                
                var tmpModelId = this.o[i].modelId;
                
                // only bind new buffer if the model is different
                if ( currentModelId !== tmpModelId ) {

                    currentModelId = tmpModelId;
                    currentModel = this.engine.objectsModels[currentModelId];
                    
                    gl.uniform3f(prog.uScale, currentObject.stats.size, currentObject.stats.size, currentObject.stats.size);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, currentModel.vertexPosition);
                    gl.vertexAttribPointer(prog.aVertexPosition, currentModel.vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentModel.vertexIndex);
                 
                }
                
                // mode 3 = scene Picking
				if ( mode == 3 ) {
                
                    color = this.engine.idToPickingColor(i);
				
                } else {
                
                    // Change color of units based on who they belong to
                    color = currentObject.player.color.slice(0);
                    
                    // Change color if object is currently selected
					if ( this.engine.me.selected.indexOf(i + 1) != -1 ) {
                    
						color[1] = 1.0;
					
                    }
					
				}
                
                // Position of the object
				var position = (currentObject.position).slice(0);
                position[1] += currentObject.stats.size / 2;

                
                // change opacity of the object based on the reload time of its attack
				var timeSinceLastAttack = ( new Date().getTime() ) - currentObject.lastAttack;
				color[3] = ( timeSinceLastAttack / (currentObject.stats.attackSpeed * 1000) );
                
                // orientation of the object
                var orientation = currentObject.direction;
                
				gl.uniform3fv(prog.uDirection, orientation);
				gl.uniform4fv(prog.uColor, color);
				gl.uniform3fv(prog.uTranslation, position);
				
                // draw object
                gl.drawElements(gl.TRIANGLES, currentModel.vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
			
            }
		
        }
		
		gl.disableVertexAttribArray(prog.aVertexPosition);
		
		/* render buildings */
		/*
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers['cube'].vertexPosition);
		gl.vertexAttribPointer(shaderPrograms['missile'].vertexPositionAttribute, buffers['cube'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['cube'].vertexIndex);
		
		for(var ii = 0; ii < objs.nbTotal; ii++) {
			if((this.o[ii].uniqueId != -1) && (this.o[ii].type == TYPE.BUILDING)) {
				console.log("ok2");
				var position = objs.o[ii].position;
			
				color[0] = 0.0;
				color[1] = 0.0;
				color[2] = 0.0;
				color[3] = 1.0;
						
				if(player1.selected.indexOf(ii + 1) != -1) {
					color[1] = 1.0;
				}
				
				if(objs.o[ii].player == 1) {
					color[2] = 1.0;
				} else {
					color[0] = 1.0;
				}
				
				gl.uniform3f(shaderPrograms['missile'].scaleUniform, 20.0, 10.0, 20.0);
				gl.uniform4f(shaderPrograms['missile'].colorUniform, color[0], color[1], color[2], 1.0);
				gl.uniform3f(shaderPrograms['missile'].translationUniform, position[0], position[1] + 5.0, position[2]);
				gl.drawElements(gl.TRIANGLES, buffers['cube'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
			}
		}
		
		gl.uniform3f(shaderPrograms['missile'].scaleUniform, 1.0, 1.0, 1.0);
		
		gl.disableVertexAttribArray(shaderPrograms['missile'].vertexPositionAttribute);
		gl.disableVertexAttribArray(shaderPrograms['missile'].vertexColorAttribute);
		*/
		
		/* render selection lines */
		/*
		if((player1.selected.length == 1) && (typeof objs.o[player1.selected[0]-1].actions[0] != 'undefined')) {
			
			var idSelected = player1.selected[0];
			
			var prog = 'uniformColor';
			var color = [];
			if(objs.o[idSelected-1].actions[0].type == ACT.MOVE) {
				color = [0.0, 0.0, 1.0];
			} else if(objs.o[idSelected-1].actions[0].type == ACT.FOLLOW) {
				color = [0.0, 1.0, 0.0];
			} else if(objs.o[idSelected-1].actions[0].type == ACT.ATK) {
				color = [1.0, 0.0, 0.0];
			}
			
			gl.useProgram(shaderPrograms[prog]);
			gl.enableVertexAttribArray(shaderPrograms[prog].vertexPositionAttribute);

			setMatrixUniforms(shaderPrograms[prog]);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, buffers['line'].vertexPosition);
		
			LineVertices[0] = objs.o[idSelected-1].position[0];
			LineVertices[1] = objs.o[idSelected-1].position[1]+4;
			LineVertices[2] = objs.o[idSelected-1].position[2];
			LineVertices[3] = objs.o[idSelected-1].actions[0].targetPosition[0];
			LineVertices[4] = objs.o[idSelected-1].actions[0].targetPosition[1]+10;
			LineVertices[5] = objs.o[idSelected-1].actions[0].targetPosition[2];
			
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(LineVertices), gl.DYNAMIC_DRAW);
			gl.vertexAttribPointer(shaderPrograms[prog].vertexPositionAttribute, buffers['line'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers['line'].vertexIndex);
			
			gl.uniform3f(shaderPrograms[prog].translationUniform, 0.0, 0.0, 0.0);
			gl.uniform4f(shaderPrograms[prog].colorUniform, color[0], color[1], color[2], 1.0);
			
			gl.drawElements(gl.LINES, buffers['line'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);

			gl.disableVertexAttribArray(shaderPrograms[prog].vertexPositionAttribute);
			
			
		}
		*/
	}
};

/**
*   Do every action of each object
*   @param {number} time since last action was performed
*/
ObjsManager.prototype.doActions = function( elapsed ) {
    
    for ( var i = 0; i < this.nbTotal; ++i ) {
        
        var currentObject = this.o[i];
    
        if ( currentObject.uniqueId != -1 ) {
        
            currentObject.lastMove += elapsed;
            
            currentObject.doAction( currentObject.lastMove, this );

            currentObject.lastMove = 0;
            
        }
        
    }

};

/**
*   Object class
*   
*   @param {number} type of object (unit, building, ..)
*   @param {number} identification of the model of the object
*   @param {number} current position of the object
*   @param {Player} who does this object belong too
*   @param {number} unique id of the object
*/
var Obj = function(_type, _modelId, _pos, _player, _uniqueId) {
	
    this.position;
	this.realPosition;
	
	this.type;
	this.id;
	this.player;
	this.uniqueId;
	
	this.level;
	this.actions;
	this.direction;

	this.isDead;
	
	this.stats;
    this.model;
    
	this.lastMove;
	this.lastAttack;
	
	this.currentHP;
	
	this.def(_type, _modelId, _pos, _player, _uniqueId);
};

Obj.prototype.def = function(_type, _modelId, _pos, _player, _uniqueId) {
	this.position = _pos;
	this.realPosition = _pos;
	
	this.type = _type;
	this.modelId = _modelId;
	this.player = _player;
	this.uniqueId = _uniqueId;
	
	this.level = 0;
	this.actions = [];
	this.direction = [1.0, 0.0, 0.0];
	
	this.stats = this.getStats(_type, _modelId);
	this.model = this.getModel(_type, _modelId);

	this.lastMove = 0;
	this.lastAttack = new Date().getTime();
	
	this.currentHP = this.stats.max_hp;
};

Obj.prototype.clear = function(_type, _modelId, _position, _player, _uniqueId) {
	this.def(_type, _modelId, _position, _player, _uniqueId);
};

Obj.prototype.randomMove = function(time) {
	this.position[0] += this.stats.moveSpeed * (time/1000);
	this.position[1] = this.engine.map.getHeightAt(this.position[0], this.position[2]);
};

function vec2dist(v1, v2) {
	var d = Math.sqrt(((v1[0] - v2[0])*(v1[0] - v2[0]))
									+
								 ((v1[1] - v2[1])*(v1[1] - v2[1])));
								 
	return d;
}

/**
*   Find the closest point available next to _pos
*   @param {array} Position where we need to be close
*   @param {Object} QuadTree for collision detection
*/
Obj.prototype.getClosestPointAvailable = function( _pos, quadTree ) {
    
    // Find items that would collide with _pos
	var items = this.quadtree.retrieve({
                    x : _pos[0] - (this.stats.size/2),
                    y : _pos[2] - (this.stats.size/2), 
                    width: this.stats.size, 
                    height: this.stats.size
                });
	
    
	for ( var i = 0; i < items.length; ++i ) {
    
		// No collision detection on itself
		if (!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
            
            return -1;
			// If there is a collision
            /*
			var u = objs.o[items[i].id];
			
            if((vec2dist([_pos[0], _pos[2]], [items[ii].x, items[ii].y]) < (this.stats.size/2 + u.stats.size/2))) {
							
				if(u.type == TYPE.UNIT) {
					return 0;
				} else {
					var vecToPoint = [_pos[0] - items[ii].x, 0.0, _pos[2] - items[ii].y];
					vec3.normalize(vecToPoint);
					var v = [];
					v[0] = items[ii].x + vecToPoint[0]*(this.stats.size/2 + u.stats.size/2 + 0.1);
					v[2] = items[ii].y + vecToPoint[2]*(this.stats.size/2 + u.stats.size/2 + 0.1);
					v[1] = myTerrain.getHeightAt(v[0], v[2])
					
					return v;
				}
			}*/
		}
	}
	
	return 0;
}

Obj.prototype.instantMove = function(_pos, _direction, _time) {
	
	/*
	var items = objs.quadtree.retrieve({x : _pos[0] - (this.stats.size/2), y : _pos[2] - (this.stats.size/2), width: this.stats.size, height: this.stats.size});
	
	for(var ii = 0; ii < items.length; ii++) {
		// On ne calcul pas la collision de l'objet sur lui même (logique!)
		if(!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
			//si il y a une collision
			if((vec2dist([_pos[0], _pos[2]], [items[ii].x, items[ii].y]) < this.stats.size)) {
			
				var u = objs.o[items[ii].id];
				
				if(u.type == TYPE.UNIT) {				
					var pushVector = [u.position[0] - _pos[0], 0.0, u.position[2] - _pos[2]];
					
					vec3.normalize(pushVector);
					
					var coef = vec3.dot(pushVector, _direction);
					
					if(coef >= 0) {
						var newPos = [u.position[0] + (pushVector[0] * this.stats.moveSpeed*(_time/1000)*coef),
									  0.0,
									  u.position[2] + (pushVector[2] * this.stats.moveSpeed*(_time/1000)*coef)];
									  
						newPos[1] = myTerrain.getHeightAt(newPos[0], newPos[2])

						u.instantMove(newPos, pushVector, _time);
					}
				} else {
					return -1;
				}
			}
		}
	}
	*/
	this.position = _pos;
}

/**
*   Move an object while performing collision detection
*   @param {number} time since last move
*   @param {Array.<number>} Destination
*   @param {Boolean} if true, action will be performed instantly (teleportation with no detection)
*   @param {Object} ObjectManager required for collision etc..
*/
Obj.prototype.move = function(_time, _targetPosition2, instant, objs ) {
	
	var _targetPosition = [];
	_targetPosition[0] = _targetPosition2[0];
	_targetPosition[1] = _targetPosition2[1];
	_targetPosition[2] = _targetPosition2[2];
	
    // Direction of the unit is : destination - currentPosition
	vec3.subtract(_targetPosition, this.position, this.direction);
	
	this.direction[1] = 0.0;
	
	vec3.normalize(this.direction);
	
	// Calculation of next position based on movement speed and time since last move	
	var nextPos = [this.position[0] + (this.direction[0] * this.stats.moveSpeed * ( _time / 1000 ) ),
				   this.position[2] + (this.direction[2] * this.stats.moveSpeed * ( _time / 1000 ) )];
	
    // nextPos might not be a valid move, check the cloest point available
	/*var newTargetPosition = this.getClosestPointAvailable( _targetPosition, objs.quadTree );
    
	if ( newTargetPosition > 0 ) {
		_targetPosition = newTargetPosition;
	} else if ( newTargetPosition == -1 ) {
        
    }
    */
	 
	// Retrieve every possible collision if the unit move to nextPos
	var items = objs.quadtree.retrieve({
                x : nextPos[0] - (this.stats.size / 2), 
                y : nextPos[1] - (this.stats.size / 2), 
                width: this.stats.size, 
                height: this.stats.size
            });
	
    
	for ( var i = 0; i < items.length; ++i ) {
    
		// No collision with itself
		if(!((this.position[0] == items[i].x) && (this.position[2] == items[i].y))) {
						
			var u = objs.o[items[i].id];
			
			// if there is a collision
			if((vec2dist(nextPos, [items[i].x, items[i].y]) < (this.stats.size/2 + u.stats.size/2))) {
				
                // Go around static objects
				if(u.type == TYPE.BUILDING) {
				
					var pushVector = [  u.position[0] - this.position[0], 
                                        0.0, 
                                        u.position[2] - this.position[2]];
					
					vec3.normalize(pushVector);
					
                    // Change the direction of the movement to go around the object
					if ( ( pushVector[2] * this.direction[0] - pushVector[0] * this.direction[2] ) < 0 ) {
						this.direction[0] = pushVector[2] * -1;
						this.direction[2] = pushVector[0];
					} else {
						this.direction[0] = pushVector[2];
						this.direction[2] = pushVector[0] * -1;
					}
                    
                    
					nextPos = [ this.position[0] + (this.direction[0] * this.stats.moveSpeed*(_time/1000)),
								this.position[2] + (this.direction[2] * this.stats.moveSpeed*(_time/1000))];
					/*			
					if ( this.getClosestPointAvailable([nextPos[0], 0.0, nextPos[1]]) ) {
						return 0;
					}*/
								
				} else if(u.type == TYPE.UNIT) {
					
                    // Push non-static objects
					
                    // direction of the push
                    var pushVector = [u.position[0] - nextPos[0], 0.0, u.position[2] - nextPos[1]];
					
					vec3.normalize(pushVector);
					
					var coef = vec3.dot(pushVector, this.direction);
					
					
					if(coef > 0) {
					
						var newPos = [u.position[0] + (pushVector[0] * this.stats.moveSpeed * ( _time/1000) ),
									  0.0,
									  u.position[2] + (pushVector[2] * this.stats.moveSpeed * ( _time/1000 ) )];
									  
						newPos[1] = objs.engine.map.getHeightAt(newPos[0], newPos[2])

						u.move(_time, [newPos[0], newPos[1], newPos[2]], true, objs);
						
					}
				}
			}
		}
	}
	
	var dist = Math.sqrt(((_targetPosition[0] - this.position[0])*(_targetPosition[0] - this.position[0]))
							+
						 /*((_targetPosition[1] - this.position[1])*(_targetPosition[1] - this.position[1]))
							+*/
						 ((_targetPosition[2] - this.position[2])*(_targetPosition[2] - this.position[2])));
	
	// move
	if ( dist < this.stats.moveSpeed * ( _time/1000 ) ) {
		this.position[0] = _targetPosition[0];
		this.position[2] = _targetPosition[2];
		this.position[1] = objs.engine.map.getHeightAt(this.position[0], this.position[2]);
		if ( !instant )
			this.actions.shift();
	} else {		
		this.position[0] = nextPos[0];
		this.position[2] = nextPos[1];
		this.position[1] = objs.engine.map.getHeightAt(this.position[0], this.position[2]);
	}
};

Obj.prototype.move2 = function(_time, _target, _targetPosition) {
	// Calcul la prochaine position	
	var nextPos = [this.position[0] + (this.direction[0] * this.stats.moveSpeed*(_time/1000)),
				   this.position[2] + (this.direction[2] * this.stats.moveSpeed*(_time/1000))];

	// récupére tous les obj dans la zone en question pour la collision
	var items = objs.quadtree.retrieve({x : nextPos[0] - (this.stats.size/2), y : nextPos[1] - (this.stats.size/2), width: this.stats.size, height: this.stats.size});
	
	for(var ii = 0; ii < items.length; ii++) {
		// On ne calcul pas la collision de l'objet sur lui même (logique!)
		if(!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
			//si il y a une collision
			
			var u = objs.o[items[ii].id];

			if((vec2dist(nextPos, [items[ii].x, items[ii].y]) < (this.stats.size/2 + u.stats.size/2))) {

				
				// si l'unité n'a pas d'action courante, on modifi sa position
				//if(u.actions.length == 0) {
				
					var pushVector = [u.position[0] - nextPos[0], 0.0, u.position[2] - nextPos[1]];
					
					vec3.normalize(pushVector);
					
					var coef = vec3.dot(pushVector, this.direction);
					
					
					if(coef > 0) {
					
						var newPos = [u.position[0] + (pushVector[0] * this.stats.moveSpeed*(_time/1000)),
									  0.0,
									  u.position[2] + (pushVector[2] * this.stats.moveSpeed*(_time/1000))];
									  
						newPos[1] = myTerrain.getHeightAt(newPos[0], newPos[2])
						
						if(u.type == TYPE.UNIT) {
							u.instantMove(newPos, pushVector, _time);
						} else {
							return -1;
						}
					
					}
		
				//} else {
					//this.actions.shift();
					//return -1;
				//}
			}
		}
	}
	
				
	var dist = Math.sqrt(((_targetPosition[0] - this.position[0])*(_targetPosition[0] - this.position[0]))
							+
						 ((_targetPosition[1] - this.position[1])*(_targetPosition[1] - this.position[1]))
							+
						 ((_targetPosition[2] - this.position[2])*(_targetPosition[2] - this.position[2])));
	
	// move
	if(dist < this.stats.moveSpeed*(_time/1000)) {
		this.position = _targetPosition;
		this.position[1] = myTerrain.getHeightAt(this.position[0], this.position[2]);
		this.actions.shift();
	} else {			
		this.position[0] = nextPos[0];
		this.position[2] = nextPos[1];
		this.position[1] = myTerrain.getHeightAt(this.position[0], this.position[2]);
	}
	
}

/**
*   Performe current action of the object
*   @param {number} Time since last action was performed
*   @param {Object} ObjectManager containing other object, required for collision detection
*/
Obj.prototype.doAction = function( time, objs ) {
	
    // if the object currently has any action to be done
	if(this.actions.length > 0) {
	
		var type = this.actions[0].type;
		var target = this.actions[0].target;
		var targetPosition = this.actions[0].targetPosition;
		
		// On regarde si l'action est toujours valide (elle peut être invalide par exemple si la cible est morte)
		if ( target != -1 ) {
			if ( objs.o[target].uniqueId == -1 ) {
				this.actions.shift();
				return -1;
			}
		}
		
		if ( type == ACT.MOVE ) {

			this.move( time, targetPosition, false, objs );
            
		} else if ( type == ACT.FOLLOW ) {
			
			this.actions[0].targetPosition = objs.o[target].position;
			
            var dist = Math.sqrt(((this.actions[0].targetPosition[0] - this.position[0])*(this.actions[0].targetPosition[0] - this.position[0]))
                        +
                     ((this.actions[0].targetPosition[1] - this.position[1])*(this.actions[0].targetPosition[1] - this.position[1]))
                        +
                     ((this.actions[0].targetPosition[2] - this.position[2])*(this.actions[0].targetPosition[2] - this.position[2])));
            
            if ( dist > this.stats.size / 2 + objs.o[target].stats.size / 2 ) {
                this.move( time, this.actions[0].targetPosition, false, objs );
            }
			
		}
		else if(type == ACT.ATK) {
		
			this.actions[0].targetPosition = objs.o[target].position;
			
			vec3.subtract(targetPosition, this.position, this.direction);
			
			this.direction[1] = 0.0;
			
			vec3.normalize(this.direction);
			
			var dist = Math.sqrt(((targetPosition[0] - this.position[0])*(targetPosition[0] - this.position[0]))
									+
								 ((targetPosition[1] - this.position[1])*(targetPosition[1] - this.position[1]))
									+
								 ((targetPosition[2] - this.position[2])*(targetPosition[2] - this.position[2])));
		
			// si on est pas dans le range pour attaquer, on continu d'avancer dans la direction
			if(dist > this.stats.atkRange) {

				// collision detection				
				var nextPos = [this.position[0] + (this.direction[0] * this.stats.moveSpeed*(time/1000)),
							   this.position[2] + (this.direction[2] * this.stats.moveSpeed*(time/1000))];


				// récupére tous les obj dans la zone en question
				var items = objs.quadtree.retrieve({x : nextPos[0], y : nextPos[1]});						   
				
				for(var ii = 0; ii < items.length; ii++) {
					// On ne calcul pas la collision de l'objet sur lui même (logique!)
					if(!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
						//si il y a une collision
						if(vec2dist(nextPos, [items[ii].x, items[ii].y]) < this.stats.size) {
							//return -1;
						}
					}
				}				
			
				// move
				this.position[0] = nextPos[0];
				this.position[2] = nextPos[1];
				this.position[1] = myTerrain.getHeightAt(this.position[0], this.position[2]);
			} else {
				// On attaque
				var timeSinceLastAttack = (new Date().getTime()) - this.lastAttack;
				
				if((timeSinceLastAttack / 1000.0) > this.stats.attackSpeed) {
					this.lastAttack = new Date().getTime();
					
					var dmg = this.stats.attack;
					
					objs.o[target].currentHP -= dmg;
				}
			}
		} else if(type == ACT.ATK_MOVE) {
			this.actions[0].targetPosition = objs.o[target].position;
			
			vec3.subtract(targetPosition, this.position, this.direction);
			
			this.direction[1] = 0.0;
			
			vec3.normalize(this.direction);
			
			var dist = Math.sqrt(((targetPosition[0] - this.position[0])*(targetPosition[0] - this.position[0]))
									+
								 ((targetPosition[1] - this.position[1])*(targetPosition[1] - this.position[1]))
									+
								 ((targetPosition[2] - this.position[2])*(targetPosition[2] - this.position[2])));
								 
			// On regarde autour de nous si il y a des unité à attaquer
			var items = objs.quadtree.retrieve({x : this.position[0], y : this.position[2]});						   
			
			for(var ii = 0; ii < items.length; ii++) {
				// On ne calcul pas la collision de l'objet sur lui même (logique!)
				if(!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
					//si il y a une unité dans le range
					if(vec2dist([this.position[0], this.position[2]], [items[ii].x, items[ii].y]) < this.stats.atkRange) {
						// On attaque
						
						
						return 1;
					}
				}
			}
						
			// sinon on continu d'avancer dans la direction

			// collision detection				
			var nextPos = [this.position[0] + (this.direction[0] * this.stats.moveSpeed*(time/1000)),
						   this.position[2] + (this.direction[2] * this.stats.moveSpeed*(time/1000))];


			// récupére tous les obj dans la zone en question
			var items = objs.quadtree.retrieve({x : nextPos[0], y : nextPos[1]});						   
			
			for(var ii = 0; ii < items.length; ii++) {
				// On ne calcul pas la collision de l'objet sur lui même (logique!)
				if(!((this.position[0] == items[ii].x) && (this.position[2] == items[ii].y))) {
					//si il y a une collision
					if(vec2dist(nextPos, [items[ii].x, items[ii].y]) < this.stats.size) {
						//return -1;
					}
				}
			}				
		
			// move		
			this.position[0] = nextPos[0];
			this.position[2] = nextPos[1];
			this.position[1] = myTerrain.getHeightAt(this.position[0], this.position[2]);

		}
	}
}

Obj.prototype.overideAction = function(_type, _target) {
	this.actions = [];
	this.addAction(_type, _target);
}

Obj.prototype.addAction = function(_type, _target) {
	switch(_type) {
	case ACT.MOVE:
		this.actions.push(new Action(_type, -1, _target, -1));
		break;
	case ACT.FOLLOW:
		var targetPosition = objs.o[_target].position;
		var targetUniqueId = objs.o[_target].uniqueId;
		this.actions.push(new Action(_type, _target, targetPosition, targetUniqueId));
		break;
	case ACT.ATK:
		var targetPosition = objs.o[_target].position;
		var targetUniqueId = objs.o[_target].uniqueId;
		this.actions.push(new Action(_type, _target, targetPosition, targetUniqueId));
		break;
	}
}

Obj.prototype.getStats = function(_type, _id) {
	switch(_type) {
	case 1:
		return Units.getStats(_id);
		break;
	case 2:
		return Buildings.getStats(_id);
		break;
	}
}

Obj.prototype.getModel = function(_type, _id) {
	switch(_type) {
	case 1:
		return Units.getModel(_id);
		break;
	case 2:
		return Buildings.getModel(_id);
		break;
	}
}

Obj.prototype.renderColorPicking = function() {

}

/*
	Actions
*/
function Action(_type, _target, _targetPosition, _targetUniqueId) {
	this.type = _type;
	this.target = _target;
	this.targetPosition = _targetPosition;
	this.targetUniqueId = _targetUniqueId
}

var ACT = {
	MOVE : 1,
	ATK : 2,
	ATK_MOVE : 3,
	FOLLOW : 4,
	HOLD : 5
}

var TYPE = {
	UNIT : 1,
	BUILDING : 2
}

/*
	List of units
*/

var Units = {

	getStats : function(id) {
	
		var stats = {};
		
		switch(id) {
		case 0:
			stats = {
				max_hp : 20,
				moveSpeed : 20,
				attack : 2,
				attackSpeed : 1,
				armor : 1,
				size : 8,
				atkRange : 60
			}
			break;
		default:
			stats = {
				max_hp : 10,
				moveSpeed : 1,
				attack : 2,
				attackSpeed : 1,
				armor : 1,
				size : 1,
				atkRange : 60
			}
			break;
		}
		
		return stats;	
	},
	
	getData : function(id) {
	
	},
	
	getModel : function(id) {
		
	}
}

/*
	List of buildings
*/
var Buildings = {

	getStats : function(id) {
	
		var stats = {};
		
		switch(id) {
		case 1:
			stats = {
				max_hp : 100,
				attack : 0,
				atkRange : 0,
				moveSpeed : 0,
				attackSpeed : 0,
				armor : 1,
				size : 8
			}
			break;
		case 2:
			stats = {
				max_hp : 100,
				attack : 0,
				atkRange : 0,
				moveSpeed : 0,
				attackSpeed : 0,
				armor : 1,
				size : 16
			}
			break;
		case 3:
			stats = {
				max_hp : 100,
				attack : 0,
				atkRange : 0,
				moveSpeed : 0,
				attackSpeed : 0,
				armor : 1,
				size : 16
			}
			break;
		default:
			stats = {
				max_hp : 50,
				size : 2
			}
			break;
		}
		
		return stats;	
	},
	
	getData : function(id) {
	
	},
	
	getModel : function(id) {
		var model = '';
		
		switch(id) {
		case 0:
			model = 'b1';
			break;
		case 1:
			model = 'b1';
			break;
		case 2:
			model = 'b1';
			break;
		default:
			model = 'b1';
			break;
		}
		
		return model;
	}
}

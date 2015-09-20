'use strict';

var Player = function(_id, _color) {
	this.color = _color;
	this.id = _id;
	
    this.selected = [];
    
	this.currentAction = 0;
};

Player.prototype.overideSelection = function(_objId) {
	this.clearSelection();
	this.addSelection(_objId);
};

Player.prototype.addSelection = function(_objId) {
	
    if ( this.selected.indexOf(_objId) == -1 ) {
    
		this.selected.push(_objId);
    
    }

};

Player.prototype.removeFromSelection = function(_objId) {
	var index = this.selected.indexOf(_objId);

	if ( index > -1 ) {
		this.selected.splice(index, 1);
	}
};

Player.prototype.clearSelection = function() {
	this.selected = [];
};

/* Action */

Player.prototype.setCurrentAction = function(action) {
	this.currentAction = action;
};

var PLAYER_ACTION = {
	NONE : 0,
	ATK : 1,
	MOVE : 2,
	BUILD : 3
};
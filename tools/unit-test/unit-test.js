/**
*   UNIT TEST class
*/

UTnbTab = 0;

/**
*   Error object
*   @param {String} Function name
*   @param {Number} error number
*   @param {String} Error description
*/
var UTResult = function(f, e, s) {
    this.func = f;
    this.error = e;
    this.string = s;
    this.time = 0;
    this.stack = {};
};

UTRun = function(functions, moduleName) {
    var now = 0;
    var tmp;
    var results = [];
    
    for ( var i = 0; i < functions.length; i++ ) {
        now = new Date().getTime();
        
        try {
            tmp = functions[i].call();
        } catch(e) {
            tmp = {func: '', error: -1, string: e, time: 0, stack: e.stack};
        }
        
        
        tmp.time = new Date().getTime() - now;
        
        results.push(tmp);
    }
    
    UTdisplay(results, moduleName);
}

/**
*   @param {Array} Array of UTResult
*   @param {String} Name of the testing module
*/
UTdisplay = function(e, name) {
    
    $('body').append("<table id='UTtable" + UTnbTab + "' class='UTtable'></table>");
    $('#UTtable'+UTnbTab).append("<tr class='UTtableHead'><td width='20%'>Module : " + name + "</td></tr>");

    for ( var i = 0; i < e.length; ++i ) {
        
        var error = e[i].error;
        var string = e[i].string;
        var func = e[i].func;
        var time = e[i].time;
        var type;
        
        if ( error == 0 ) {
            type = 'UTrowSuccess';
        } else {
            type = 'UTrowError';
        }
        
        $('#UTtable'+UTnbTab).append(
            "<tr id='UTrow" + i + "_" + UTnbTab + "' class='UTtableRow " + type + "'>" +
                "<td>" + error + "</td>" +
                "<td>" + func + "</td>" +
                "<td>" + string + "</td>" +
                "<td>" + time + "ms</td>" +
            "</tr>");
            
    }
    
    UTnbTab += 1;
};
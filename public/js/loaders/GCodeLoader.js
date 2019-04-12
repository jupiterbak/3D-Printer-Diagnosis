'use strict';

/**
 * THREE.GCodeLoader is used to load gcode files usually used for 3D printing or CNC applications.
 *
 * Gcode files are composed by commands used by machines to create objects.
 *
 * @class THREE.GCodeLoader
 * @param {Manager} manager Loading manager.
 * @author tentone
 * @author joewalnes
 */
THREE.GCodeLoader = function(manager) {
    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};

THREE.GCodeLoader.prototype.load = function(filename, onLoad, onProgress, onError) {

    var self = this;
    var url = self.manager.resolveURL("/CAD" + filename);

    self.setPath(filename);
    self.manager.itemStart(url);
    $.getJSON("/CAD", {
            filename: filename
        })
        .done(function(data) {
            onLoad(self.loadData(data));
        }).fail(function() {
            self.manager.itemError(url);
        }).always(function() {
            self.manager.itemEnd(url);
        });
};

THREE.GCodeLoader.prototype.setPath = function(value) {

    this.path = value;
    return this;

};

THREE.GCodeLoader.prototype.loadData = function(data) {
    var self = this;

    var state = { x: 0, y: 0, z: 0, e: 0, f: 0, extruding: false, relative: false };
    var layers = [];

    var currentLayer = undefined;

    function newLayer(line) {

        currentLayer = { vertex: [], pathVertex: [], z: line.z };
        layers.push(currentLayer);

    }

    //Create lie segment between p1 and p2
    function addSegment(p1, p2) {

        if (currentLayer === undefined) {

            newLayer(p1);

        }

        if (line.extruding) {

            currentLayer.vertex.push(p1.x, p1.y, p1.z);
            currentLayer.vertex.push(p2.x, p2.y, p2.z);

        } else {

            currentLayer.pathVertex.push(p1.x, p1.y, p1.z);
            currentLayer.pathVertex.push(p2.x, p2.y, p2.z);

        }

    }

    function delta(v1, v2) {

        return state.relative ? v2 : v2 - v1;

    }

    function absolute(v1, v2) {

        return state.relative ? v1 + v2 : v2;

    }

    // For now we just assume that only lines are generates
    // Therefore data is an array of lines
    var lines = data;

    for (var i = 0; i < lines.length; i++) {
        var _line = lines[i];
        var _type = _line.type;
        var _motion = _line.motion;

        //Process the data commands
        //G0/G1 – Linear Movement
        if (_type === 'LINE') {

            var line = {
                x: _line.v2.x !== undefined ? absolute(state.x, _line.v2.x) : state.x,
                y: _line.v2.y !== undefined ? absolute(state.y, _line.v2.y) : state.y,
                z: _line.v2.z !== undefined ? absolute(state.z, _line.v2.z) : state.z,
                e: _line.v2.e !== undefined ? absolute(state.e, _line.v2.e) : state.e,
                f: _line.v2.f !== undefined ? absolute(state.f, _line.v2.f) : state.f,
            };

            //Layer change detection is or made by watching Z, it's made by watching when we extrude at a new Z position
            if (delta(state.e, line.e) > 0) {
                line.extruding = delta(state.e, line.e) > 0;
                if (currentLayer == undefined || line.z != currentLayer.z) {
                    newLayer(line);
                }
            }

            addSegment(state, line);
            state = line;

        } else if (_type === 'CURVE') {

            //G2/G3 - Arc Movement ( G2 clock wise and G3 counter clock wise )
            console.warn('THREE.GCodeLoader: Arc command not supported');

        } else if (_motion === 'G90') {

            //G90: Set to Absolute Positioning
            state.relative = false;

        } else if (_motion === 'G91') {

            //G91: Set to state.relative Positioning
            state.relative = true;

        } else if (_motion === 'G92') {

            //G92: Set Position
            var line = state;
            line.x = _line.v2.x !== undefined ? _line.v2.x : line.x;
            line.y = _line.v2.y !== undefined ? _line.v2.y : line.y;
            line.z = _line.v2.z !== undefined ? _line.v2.z : line.z;
            line.e = _line.v2.e !== undefined ? _line.v2.e : line.e;
            state = line;

        } else {
            console.warn('THREE.GCodeLoader: Command not supported:' + _motion);
        }

    }
    return layers;
};
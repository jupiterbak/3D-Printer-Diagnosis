'use strict';

// Load dependencies
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var log = function(text) { console.log("[" + new Date().toISOString() + "] " + text.toString()); };
var tmpCAD = {};

// Configure Express
app.use(express.static(__dirname + '/public'));

// GCODE PARSER
const GCodeToolpath = require('./modules/GCodeToolpath.js');
var toolpaths = [];
const toolpath = new GCodeToolpath({
    // Initial position (optional)
    position: { x: 0, y: 0, z: 0 },

    // @param {object} modal The modal object.
    // @param {object} v1 A 3D vector of the start point.
    // @param {object} v2 A 3D vector of the end point.
    addLine: (modal, v1, v2) => {
        const motion = modal.motion;
        const tool = modal.tool;
        toolpaths.push({ type: 'LINE', motion: motion, tool: tool, v1: v1, v2: v2 });
    },

    // @param {object} modal The modal object.
    // @param {object} v1 A 3D vector of the start point.
    // @param {object} v2 A 3D vector of the end point.
    // @param {object} v0 A 3D vector of the fixed point.
    addArcCurve: (modal, v1, v2, v0) => {
        const motion = modal.motion;
        const tool = modal.tool;
        toolpaths.push({ type: "CURVE", motion: motion, tool: tool, v1: v1, v2: v2, v0: v0 });
    }
});

// Configure the route and the server
app.get('/CAD', function(req, res, next) {
    log("--> /CAD");
    const filename = req.query['filename'];

    if (filename) {
        // Check if cad exist in the tmp variable
        if (tmpCAD[filename]) {
            res.send(JSON.stringify(tmpCAD[filename]));
        } else {
            // fetch it from the file system
            toolpaths = [];
            // Load G-code from file
            const file = __dirname + '/public/models/gcode/' + filename;
            toolpath.loadFromFile(file, function(err, data) {
                // Send the error or the gcode as an array
                if (err) {
                    res.send("[]");
                } else {
                    tmpCAD[filename] = toolpaths;
                    res.send(JSON.stringify(toolpaths));
                    //console.log(JSON.stringify(toolpaths));
                }
            });
        }

    } else {
        res.sendStatus(404);
    }

});

app.get('/GetAllData', function(req, res, next) {
    log("--> /GetAllData");
    const _length = req.query['length'];
    const filename = req.query['filename'];
    var _userData = {
        step: 400,
        maxTorque: 3800,
        minTorque: 1800,
        maxTemp: 125,
        minTemp: 25,
        logs: []
    };

    // TODO: Get Data from Mongo DB
    for (let index = 0; index < _length; index++) {
        var executed = index < _userData.step;
        _userData.logs.push({
            executed: executed,
            temperature: executed ? Math.random() * 100 + 25 : 25,
            torque: executed ? Math.random() * 2000 + 1800 : 1800,
        });
    }

    res.send(JSON.stringify(_userData));
});

server.listen(5500, function(params) {
    log("Server started on port:" + 5500);
});
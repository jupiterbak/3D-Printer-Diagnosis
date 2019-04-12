'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function() {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }
    return function(Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; };
}(); /* eslint no-continue: 0 */


var _gcodeParser = require('gcode-parser');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var noop = function noop() {};

/**
 * Returns an object composed from arrays of property names and values.
 * @example
 *   fromPairs([['a', 1], ['b', 2]]);
 *   // => { 'a': 1, 'b': 2 }
 */
var fromPairs = function fromPairs(pairs) {
    var index = -1;
    var length = !pairs ? 0 : pairs.length;
    var result = {};

    while (++index < length) {
        var pair = pairs[index];
        result[pair[0]] = pair[1];
    }

    return result;
};

var partitionWordsByGroup = function partitionWordsByGroup() {
    var words = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    var groups = [];

    for (var i = 0; i < words.length; ++i) {
        var word = words[i];
        var letter = word[0];

        if (letter === 'G' || letter === 'M' || letter === 'T') {
            groups.push([word]);
            continue;
        }

        if (groups.length > 0) {
            groups[groups.length - 1].push(word);
        } else {
            groups.push([word]);
        }
    }

    return groups;
};

var interpret = function interpret(self, data) {
    var groups = partitionWordsByGroup(data.words);

    for (var i = 0; i < groups.length; ++i) {
        var words = groups[i];
        var word = words[0] || [];
        var letter = word[0];
        var code = word[1];
        var cmd = '';
        var args = {};

        if (letter === 'G') {
            cmd = letter + code;
            args = fromPairs(words.slice(1));

            // Motion Mode
            if (code === 0 || code === 1 || code === 2 || code === 3 || code === 38.2 || code === 38.3 || code === 38.4 || code === 38.5) {
                self.motionMode = cmd;
            } else if (code === 80) {
                self.motionMode = '';
            }
        } else if (letter === 'M') {
            cmd = letter + code;
            args = fromPairs(words.slice(1));
        } else if (letter === 'T') {
            // T1 ; w/o M6
            cmd = letter;
            args = code;
        } else if (letter === 'F') {
            // F750 ; w/o motion command
            cmd = letter;
            args = code;
        } else if (letter === 'X' || letter === 'Y' || letter === 'Z' || letter === 'A' || letter === 'B' || letter === 'C' || letter === 'I' || letter === 'J' || letter === 'K') {
            // Use previous motion command if the line does not start with G-code or M-code.
            // @example
            //   G0 Z0.25
            //   X-0.5 Y0.
            //   Z0.1
            //   G01 Z0. F5.
            //   G2 X0.5 Y0. I0. J-0.5
            //   X0. Y-0.5 I-0.5 J0.
            //   X-0.5 Y0. I0. J0.5
            // @example
            //   G01
            //   M03 S0
            //   X5.2 Y0.2 M03 S0
            //   X5.3 Y0.1 M03 S1000
            //   X5.4 Y0 M03 S0
            //   X5.5 Y0 M03 S0
            cmd = self.motionMode;
            args = fromPairs(words);
        }

        if (!cmd) {
            continue;
        }

        if (typeof self.handlers[cmd] === 'function') {
            var func = self.handlers[cmd];
            func(args);
        } else if (typeof self.defaultHandler === 'function') {
            self.defaultHandler(cmd, args);
        }

        if (typeof self[cmd] === 'function') {
            var _func = self[cmd].bind(self);
            _func(args);
        }
    }
};

var GCodeInterpreter = function() {
    function GCodeInterpreter(options) {
        _classCallCheck(this, GCodeInterpreter);

        this.motionMode = 'G0';
        this.handlers = {};

        options = options || {};

        this.handlers = options.handlers || {};
        this.defaultHandler = options.defaultHandler;
    }

    _createClass(GCodeInterpreter, [{
        key: 'loadFromStream',
        value: function loadFromStream(stream) {
            var _this = this;

            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;

            var s = (0, _gcodeParser.parseStream)(stream, callback);
            s.on('data', function(data) {
                interpret(_this, data);
            });
            return s;
        }
    }, {
        key: 'loadFromFile',
        value: function loadFromFile(file) {
            var _this2 = this;

            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;

            var s = (0, _gcodeParser.parseFile)(file, callback);
            s.on('data', function(data) {
                interpret(_this2, data);
            });
            return s;
        }
    }, {
        key: 'loadFromFileSync',
        value: function loadFromFileSync(file) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;

            var list = (0, _gcodeParser.parseFileSync)(file);
            for (var i = 0; i < list.length; ++i) {
                interpret(this, list[i]);
                callback(list[i], i);
            }
            return list;
        }
    }, {
        key: 'loadFromString',
        value: function loadFromString(str) {
            var _this3 = this;

            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;

            var s = (0, _gcodeParser.parseString)(str, callback);
            s.on('data', function(data) {
                interpret(_this3, data);
            });
            return s;
        }
    }, {
        key: 'loadFromStringSync',
        value: function loadFromStringSync(str) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;

            var list = (0, _gcodeParser.parseStringSync)(str);
            for (var i = 0; i < list.length; ++i) {
                interpret(this, list[i]);
                callback(list[i], i);
            }
            return list;
        }
    }]);

    return GCodeInterpreter;
}();

module.exports = GCodeInterpreter;
// Generated by CoffeeScript 1.3.3
(function() {
  var Bot, Camera, EventEmitter, MotorController, Sonar, compulsive, five, util, _, __,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  five = require('johnny-five');

  __ = require('johnny-five/lib/fn.js');

  _ = require('underscore');

  util = require('util');

  compulsive = require('compulsive');

  EventEmitter = require('events').EventEmitter;

  Sonar = require('sonar');

  Camera = require('camera');

  MotorController = require('motor-controller');

  Bot = (function(_super) {

    __extends(Bot, _super);

    Bot.prototype.history = [];

    Bot.prototype.heading = 0;

    Bot.prototype.last = {};

    Bot.prototype.servos = [];

    function Bot(opts) {
      var _this = this;
      if (opts == null) {
        opts = {};
      }
      this.autonomous = opts.autonomous || false;
      this.motors = new MotorController({
        speed: opts.speed || 100,
        right: [3, 11],
        left: [5, 6]
      });
      this.battery = new five.Battery({
        pin: 'A0'
      });
      this.compass = new five.Magnetometer();
      this.sonar = new Sonar();
      this.camera = new Camera();
      this.battery.on('warning', function() {
        return _this.stop('warning: low power: #{@value}');
      });
      this.sonar.on('warning', function() {
        if (_this.motors.isMoving) {
          _this.motors.stop();
          return _this.sonar.scan();
        }
      });
      this.sonar.on('scanned', function() {
        var heading, ping;
        ping = _.max(_this.sonar.sweep, function(ping) {
          return ping.distance;
        });
        heading = _this.heading;
        heading -= 90 - ping.degrees;
        if (heading > 360) {
          heading = heading - 360;
        } else if (heading < 0) {
          heading = 360 + heading;
        }
        console.log("current heading: " + _this.heading + ", new heading: " + heading);
        return _this.turn(heading);
      });
    }

    Bot.prototype.start = function() {
      var _this = this;
      five.Servos().center();
      this.sonar.scan();
      this.repeat(30, 100, function() {
        return _this.heading = (_this.heading + _this.compass.heading) / 2;
      });
      return this.loop(100, function() {
        return _this._read();
      });
    };

    Bot.prototype.drive = function(control) {};

    Bot.prototype.turn = function(heading) {
      var _this = this;
      this.motors.turn('heading');
      return this.loop(100, function(control) {
        if (_this.compass.heading >= heading - 5 && _this.compass.heading <= heading + 5) {
          _this.heading = heading;
          _this.motors.go('forward');
          return control.stop();
        }
      });
    };

    Bot.prototype.stop = function(msg) {
      this._status('stopped');
      return this.motors.decelerate(0);
    };

    Bot.prototype._read = function() {
      this.last = {
        timestamp: Date.now(),
        sonar: {
          scanner: this.sonar.scanner.last ? this.sonar.scanner.last.degrees : false,
          ping: this.sonar.ping.inches
        },
        battery: {
          min: this.battery.min,
          max: this.battery.max,
          value: this.battery.value
        },
        motors: {
          left: this.motors.left.value,
          right: this.motors.right.value
        },
        compass: this.compass.bearing
      };
      this.history.push(this.last);
      return this.emit('read', null);
    };

    return Bot;

  })(EventEmitter);

  ["wait", "loop", "repeat", "queue"].forEach(function(api) {
    return Bot.prototype[api] = compulsive[api];
  });

  module.exports.Bot = Bot;

  five = require('johnny-five');

  __ = require('johnny-five/lib/fn.js');

  _ = require('underscore');

  util = require('util');

  compulsive = require('compulsive');

  EventEmitter = require('events').EventEmitter;

  Camera = (function(_super) {

    __extends(Camera, _super);

    function Camera(opts) {
      if (opts == null) {
        opts = {};
      }
      this.tilt = new five.Servo({
        range: [70, 180],
        pin: 8
      });
      this.pan = new five.Servo({
        pin: 7
      });
    }

    Camera.prototype.move = function(pos) {
      var servo, _i, _len, _ref, _results,
        _this = this;
      _ref = [this.pan, this.tilt];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        servo = _ref[_i];
        if ((pos[_i] <= servo.last.degrees - 5) || (pos[_i](function() {
          return servo.last.degrees + 5;
        }))) {
          _results.push(servo.move((pos[_i] * 90) + 90));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return Camera;

  })(EventEmitter);

  five = require('johnny-five');

  __ = require('johnny-five/lib/fn.js');

  _ = require('underscore');

  util = require('util');

  compulsive = require('compulsive');

  EventEmitter = require('events').EventEmitter;

  MotorController = (function(_super) {

    __extends(MotorController, _super);

    MotorController.prototype.isMoving = false;

    MotorController.prototype.isTurning = false;

    function MotorController(opts) {
      this.right = new five.Motor({
        pins: opts.right
      });
      this.left = new five.Motor({
        pins: opts.left
      });
      this.speed = !opts.speed ? 100 : opts.speed;
    }

    MotorController.prototype.move = function(right, left) {
      this.status('moving');
      this.right.move(right);
      return this.left.move(left);
    };

    MotorController.prototype.go = function(direction) {
      var speeds;
      switch (direction) {
        case 'forward':
          speeds = [this.speed, this.speed];
          break;
        case 'reverse':
          speeds = [-this.speed, -this.speed];
          break;
        case 'right':
          speeds = [0, this.speed];
          break;
        case 'left':
          speeds = [this.speed, 0];
      }
      return this.move(speeds);
    };

    MotorController.prototype.turn = function(angle) {
      var direction;
      direction = angle < 180 ? 'left' : 'right';
      this.go(direction);
      return this.status('turning');
    };

    MotorController.prototype.status = function(type) {
      this.isMoving = false;
      this.isTurning = false;
      this.emit(type, null);
      console.log(type);
      switch (type) {
        case 'moving':
          return this.isMoving = true;
        case 'turning':
          return this.isTurning = true;
      }
    };

    MotorController.prototype.stop = function() {
      this.move(0, 0);
      return this.status('stopped');
    };

    return MotorController;

  })(EventEmitter);

  EventEmitter = require('events').EventEmitter;

  five = require('johnny-five');

  __ = require('johnny-five/lib/fn.js');

  _ = require('underscore');

  util = require('util');

  Sonar = (function(_super) {

    __extends(Sonar, _super);

    Sonar.prototype.history = [];

    Sonar.prototype.sweep = [];

    function Sonar(opts) {
      var pins,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      pins = opts.pins || [12, 4];
      this.scanner = new five.Servo(pins[0]);
      this.ping = new five.Ping(pins[1]);
      this.steps = opts.steps || 20;
      this.min = opts.min || 10;
      this.ping.on('read', function() {
        if (_this.ping.inches < _this.min) {
          return _this.emit('warning');
        }
      });
      this.scanner.on('move', function() {
        if (_this.isScanning) {
          return _this.sweep.push({
            degrees: _this.scanner.last ? _this.scanner.last.degrees : 0,
            distance: _this.ping.inches
          });
        }
      });
      this.scanner.on('finished', function() {
        _this.scanner.stop().center();
        _this.history.push(_this.sweep);
        _this.emit('scanned', null);
        return _this.isScanning = false;
      });
    }

    Sonar.prototype.scan = function() {
      this.scanner.step(this.steps);
      return this.isScanning = true;
    };

    return Sonar;

  })(EventEmitter);

}).call(this);
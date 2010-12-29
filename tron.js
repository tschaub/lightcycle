(function(exports) {

    var resolution = 1; // units per pixel

    var NORTH = {x: 0, y: -1};
    var EAST = {x: 1, y: 0};
    var SOUTH = {x: 0, y: 1};
    var WEST = {x: -1, y: 0};

    function createHandler(cycle, direction) {
        return function() {
            if (cycle.direction === direction) {
                cycle.boost();
            } else if (cycle.direction.x !== -direction.x && cycle.direction.y !== -direction.y) {
                cycle.direction = direction;
            }
        };
    }

    function Cycle(config) {
        for (var key in config) {
            this[key] = config[key];
        }
        this.initialPosition = {
            x: this.position.x,
            y: this.position.y
        };
        this.initialDirection = this.direction;
        this.initialSpeed = this.speed;
        this.boosted = false;
        // set up keyboard handlers
        var handlers = {};
        handlers[this.keys[0]] = createHandler(this, NORTH);
        handlers[this.keys[1]] = createHandler(this, EAST);
        handlers[this.keys[2]] = createHandler(this, SOUTH);
        handlers[this.keys[3]] = createHandler(this, WEST);
        this.handlers = handlers;
    }
    Cycle.prototype = {
        speed: 60, // units per second
        direction: NORTH,
        position: null,
        updatePosition: function(interval) {
            var distance = this.speed * (interval / 1000) / resolution;
            this.position.x += this.direction.x * distance;
            this.position.y += this.direction.y * distance;
            return this.position;
        },
        reset: function() {
            this.position.x = this.initialPosition.x;
            this.position.y = this.initialPosition.y;
            this.direction = this.initialDirection;
            this.speed = this.initialSpeed;
        },
        boost: function() {   
            if (!this.boosted) {
                this.speed *= 1.5;
                cycle = this;
                window.setTimeout(function() {
                    cycle.speed = cycle.initialSpeed;
                }, 500);
            }
        }
    };

    function Game(config) {
        for (var key in config) {
            this[key] = config[key];
        }
        var chars = {};
        for (var i=65; i<91; ++i) {
            chars[i] = String.fromCharCode(i);
        }

        var width = this.target.clientWidth;
        var height = this.target.clientHeight;

        var bgCanvas = document.createElement("canvas");
        bgCanvas.width = width;
        bgCanvas.height = height;
        var bgContext = bgCanvas.getContext("2d");
        bgContext.fillStyle = "rgb(20, 20, 20)";
        bgContext.fillRect(0, 0, width, height);
        bgContext.fillStyle = "rgb(200, 200, 200)";
        var rows = Math.round((height-1) / 25);
        var cols = Math.round((width-1) / 25);
        var rowHeight = (height-1) / rows;
        var colWidth = (width-1) / cols;
        for (var r=0; r<rows+1; ++r) {
            bgContext.fillRect(0, r * rowHeight, width, 1);
        }
        for (var c=0; c<cols+1; ++c) {
            bgContext.fillRect(c * colWidth, 0, 1, height);
        }

        bgCanvas.style.position = "absolute";
        this.target.appendChild(bgCanvas);

        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = "absolute";
        this.target.appendChild(canvas);
        var context = canvas.getContext("2d");

        var game = this;

        document.onkeydown = function(event) {
            var cycle;
            var key = chars[event.keyCode];
            for (var i=0, ii=game.cycles.length; i<ii; ++i) {
                cycle = game.cycles[i];
                if (key in cycle.handlers) {
                    cycle.handlers[key]();
                }
            }
            if (event.keyCode === 32) {
                if (playing) {
                    game.stop();
                } else if (crash) {
                    game.reset();
                } else {
                    game.start();
                }
            }
        };

        var timer;
        var interval = 50;

        function update() {
            var w = 7;
            var h = 7;
            var cycle, x0, y0, x1, y1, rX, rY, rect, alpha;
            var collisions = [];
            for (var i=0, ii=game.cycles.length; i<ii; ++i) {
                cycle = game.cycles[i];
                x0 = cycle.position.x;
                y0 = cycle.position.y;
                cycle.updatePosition(interval);
                x1 = cycle.position.x;
                y1 = cycle.position.y;
                if (x1 > x0) {
                    rect = {
                        x: x0 + (w / 2), 
                        y: y0 - (h / 2),
                        w: x1 - x0,
                        h: h
                    };
                } else if (x1 < x0) {
                    rect = {
                        x: x1 - (w / 2), 
                        y: y0 - (h / 2),
                        w: x0 - x1,
                        h: h
                    };
                } else if (y1 > y0) {
                    rect = {
                        x: x0 - (h / 2),
                        y: y0 + (h / 2),
                        w: w,
                        h: y1 - y0
                    };
                } else if (y1 < y0) {
                    rect = {
                        x: x0 - (h / 2),
                        y: y1 - (h / 2),
                        w: w,
                        h: y0 - y1
                    };
                }
                context.fillStyle = cycle.style;
                // test for collisions
                if (rect.x < 0 || (rect.x + w > width) || rect.y < 0 || (rect.y + h > height)) {
                    collisions.push(cycle);
                } else {
                    data = context.getImageData(rect.x, rect.y, rect.w, rect.h).data;
                    for (var p=0, pp=rect.w*rect.h; p<pp; ++p) {
                        alpha = data[p*4 + 3];
                        if (alpha === 255) {
                            collisions.push(cycle);
                            break;
                        }
                    }
                }
                context.fillRect(
                    Math.min(x0, x1) - (w / 2), 
                    Math.min(y0, y1) - (h / 2), 
                    Math.abs(x1 - x0) + w, 
                    Math.abs(y1 - y0) + h
                );
            }
            if (collisions.length > 0) {
                game.stop(collisions);
            }
        }
        var playing = false;
        var crash = false;
        this.start = function() {
            if (playing) {
                this.stop();
            }
            timer = window.setInterval(update, interval);
            playing = true;
        };
        this.stop = function(collisions) {
            if (collisions) {
                crash = true;
            }
            playing = false;
            window.clearInterval(timer);
        };
        this.reset = function() {
            this.stop();
            for (var i=0, ii=this.cycles.length; i<ii; ++i) {
                this.cycles[i].reset();
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            update();
            crash = false;
        }
        update();
    }
            

    exports.tron = {
        Cycle: Cycle,
        Game: Game,
        NORTH: NORTH,
        EAST: EAST,
        SOUTH: SOUTH,
        WEST: WEST
    };

})(this);

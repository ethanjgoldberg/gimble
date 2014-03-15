var SQUARE = 64;
var grav = 0.2;

function dist2(x1, y1, x2, y2) {
	return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function Tile (x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color || '#333';
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = this.color;
		ctx.fillRect(x, y, SQUARE + .6, SQUARE);

		ctx.restore();
	}
}

function WallTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'wall';
	this.solid = true;
}
function UnderWallTile (x, y) {
	this.__proto__ = new Tile(x, y, 'grey');
	this.type = 'underWall';
	this.solid = false;
}

function BridgeTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.solid = false;
	this.type = 'bridge';
	this.draw = function (ctx) {
		ctx.save();
		ctx.fillStyle = 'brown';
		ctx.fillRect(this.x, this.y, SQUARE + .4, SQUARE/8);
		ctx.restore();
	}
}

function TorchTile (x, y, lighter) {
	this.__proto__ = new Tile(x, y);
	this.type = 'torch';
	this.emits = 0;
	this.lighter = lighter || 512;
	this.size = this.lighter / 512;

	this.gradient = function (ctx) {
		var grd=ctx.createRadialGradient(this.x + SQUARE/2, this.y + SQUARE/2, 0,
				this.x + SQUARE/2 + Math.random() * SQUARE/2 - SQUARE/4,
				this.y + SQUARE/2 + Math.random() * SQUARE/2 - SQUARE/4,
				this.emits);
		var op = this.size/6 - (Math.random() < 0.05? Math.random() / 8: 0);
		grd.addColorStop(0, 'rgba(255, 192, 64, ' + op + ')');
		grd.addColorStop(1, 'rgba(255, 192, 64, 0)');
		return grd;
	}
	this.drawDark = function (ctx) {
		ctx.save();
		var x = this.x + SQUARE / 2;
		var y = this.y + SQUARE / 2;
		this.emits -= .05;
		if (this.emits < 0) this.emits = 0;

		ctx.fillStyle = this.gradient(ctx);
		ctx.beginPath();
		ctx.arc(x, y, this.emits, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.restore();
	}
		
	this.draw = function (ctx) {
		ctx.save();

		ctx.beginPath();
		ctx.fillStyle = 'brown';
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.moveTo(0, (SQUARE/16) * this.size);
		ctx.lineTo((SQUARE/16) * this.size, -(SQUARE/16) * this.size);
		ctx.lineTo(-(SQUARE/16) * this.size, -(SQUARE/16) * this.size);
		ctx.fill();

		function r() { return Math.random() * 2 - 1; }

		if (this.emits) {
			for (var i = 0; i < 2; i++) {
				ctx.fillStyle = ['red', 'orange'][i];
				ctx.beginPath();
				ctx.moveTo((SQUARE/16) * this.size, -(SQUARE/16) * this.size);
				ctx.lineTo(-(SQUARE/16) * this.size, -(SQUARE/16) * this.size);
				ctx.lineTo(r(), r() -(SQUARE/4) * this.size * this.emits 
						/ this.lighter / (i + 1));
				ctx.fill();
			}
		}

		ctx.restore();
	}

	this.damage = function (n) {
		this.emits-=n;
	}

	this.light = function () {
		this.emits = this.lighter;
	}
}
function SmallTorchTile (x, y) {
	this.__proto__ = new TorchTile(x, y, 32);
}

function FuelPackTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'fuel pack';
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'blue';
		ctx.fillRect(this.x + 3 * SQUARE/8, this.y + 3 * SQUARE/8,
				SQUARE/4, SQUARE/4);

		ctx.restore();
	}
}
function FuelTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'fuel';
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'blue';
		ctx.fillRect(this.x + SQUARE/4, this.y + SQUARE / 2, 
				SQUARE/2, SQUARE/2);

		ctx.restore();
	}

	this.fuel = 1;
}

function FlyHiveTile (x, y) {
	this.__proto__ = new Tile(x, y, '#330');
	this.type = 'fly hive';
	this.solid = false;
	
	this.tick = function () {
		if (Math.random() < 0.001) {
			return new Fly (this.x + SQUARE/2, this.y + SQUARE/2);
		}
	}
}

function DoorTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.draw = function (ctx) {
		ctx.save();

		ctx.translate(this.x + SQUARE / 2, this.y + SQUARE / 2);
		ctx.beginPath();
		ctx.moveTo(-SQUARE/2, SQUARE/2);
		ctx.lineTo(-SQUARE/2, 0);
		ctx.arc(0, 0, SQUARE/2, Math.PI, 0, false);
		ctx.lineTo(SQUARE/2, SQUARE/2);
		ctx.fill();

		ctx.restore();
	}

	this.link = 0;
}

function Room (w, h, numRooms) {
	this.width = w;
	this.height = h;
	this.tiles = {};
	this.lights = [];
	this.tickers = [];
	this.flies = [];

	this.addTile = function (Type, i, j) {
		var coords = i + ',' + j;
		if (!this.tiles.hasOwnProperty(coords))
			this.tiles[coords] = [];
		var t = new Type(i*SQUARE, j*SQUARE);
		if (t.tick) this.tickers.push(t);
		if (t.emits != undefined) this.lights.push(t);
		this.tiles[coords].push(t);
	}

	this.isK = function (k, callback) {
		for (var i = 0; this.tiles[k] && i < this.tiles[k].length; i++) {
			if (callback(this.tiles[k][i])) return this.tiles[k][i];
		}
		return false;
	}

	this.is = function (i, j, callback) {
		return this.isK(i + ',' + j, callback);
	}

	this.isAt = function (x, y, callback) {
		return this.is(Math.floor(x / SQUARE), Math.floor(y / SQUARE), callback, true);
	}

	this.tileAt = function (x, y) {
		return this.tiles[Math.floor(x / SQUARE) + ',' + Math.floor(y / SQUARE)] || [];
	}

	this.darkAt = function (x, y) {
		for (var i = 0; i < this.lights.length; i++) {
			if (dist2(x, y, this.lights[i].x, this.lights[i].y) <
					this.lights[i].emits * this.lights[i].emits) {
						return false;
					}
		}
		return true;
	}

	this.collide = function (x, y, w, h) {
		return [].concat(this.tileAt(x, y))
			.concat(this.tileAt(x+w, y+h))
			.concat(this.tileAt(x+w, y))
			.concat(this.tileAt(x, y+h));
	}

	this.wallp = Math.random();
	this.bridgep = Math.random();

	this.addWalls = function () {
		for (var j = this.max_j; j < this.height; j++) {
			this.addTile(WallTile, 0, j);
			this.addTile(WallTile, this.width, j);
		}
		for (var i = 0; i < this.width; i++) {
			this.addTile(WallTile, i, this.height-1);
			this.addTile(WallTile, i, this.max_j);
		}
	}

	this.addRow = function (j, reachable) {
		var row = reachable.slice(0);
		// walls = 1
		for (var i = 0; i < reachable.length; i++) {
			row[i] = 0;
			if (reachable[i]) {
				for (var n = -2; n < 3; n++) {
					if (Math.random() < this.wallp) {
						row[i+n] = 1;
					}
				}
			}
		}
		// bridges = 2;
		var start = null;
		for (var i = 0; i < row.length; i++) {
			if (!row[i]) continue;
			if (start) {
				for (var n = start+1; n < i; n++) {
					row[n] = 2;
				}
				start = null;
				continue;
			}
			if (row[i+1] == undefined || row[i+1]) continue;

			if (Math.random() < this.bridgep) {
				start = i;
			}
		}

		for (var i = 0; i < row.length; i++) {
			if (row[i] == 1) {
				this.addTile(WallTile, i, j);
				for (var n = 0; !this.is(i, j+n, function (t) {
					return t.solid;
				}); n++) {
					this.addTile(UnderWallTile, i, j+n);
				}
			}
			if (row[i] == 2) {
				this.addTile(BridgeTile, i, j);
			}
		}
		return row;
	}

	this.addRows = function () {
		var row = [];
		for (var i = 0; i < this.width; i++) row.push(1);
		var done = false;
		var j = this.height - 4;
		while (!done && j > 0) {
			var row = this.addRow(j, row);
			done = true;
			j -= 3;
			for (var i = 0; i < row.length - 1; i++) {
				if (row[i] && !row[i+1] || !row[i] && row[i+1]) {
					done = false;
					break;
				}
			}
		}

		return j;
	}

	this.addTorches = function () {
		var offset = this.height-2;
		var chance = .4;
		var chance_m = .4;

		while (offset > this.max_j - 1) {
			var torches = 0;
			for (var i = 1; i < this.width-1; i++)  {
				if (Math.random() < chance) {
					this.addTile(TorchTile, i, offset - Math.floor(Math.random() * 3));
					torches++;
				}
			}
			offset -= 4;
			chance *= chance_m;
			if (torches < this.width / 32) chance = .4;
		}
	}

	this.addFuel = function () {
		for (var k in this.tiles) {
			var i = k.split(',')[0];
			if (i == 0 || i == this.width - 1) continue;
			var j = k.split(',')[1];
			if (this.is(i, j, function (x) { return x.type == 'wall'; })
					&& !this.is(i, j-1, function (x) { return x.solid; })
					&& j > this.max_j && Math.random() < 0.02)
				this.addTile(FuelTile, i, j-1);
		}
	}

	this.addFlyHives = function () {
		for (var k = 0; k < this.width * (this.height - this.max_j) / 1024; k++) {
			var i = Math.floor(Math.random() * this.width);
			this.addTile(FlyHiveTile, i, this.height - (Math.floor(Math.random() * (this.max_j-1) / 3)*3) - 2);
		}
	}

	this.addDoors = function () {

	}

	this.addFireflies = function () {
		var fs = [];
		for (var i = 0; i < this.width * (this.height - this.max_j) / 512; i++) {
			var x = Math.random() * this.width;
			var y = this.max_j + (Math.random() * (this.height - this.max_j));
			fs.push(new Firefly(x, y, y));
		}
		this.flies = this.flies.concat(fs);
		this.lights = this.lights.concat(fs);
	}

	this.max_j = this.addRows() - 4;
	this.addWalls();
	this.addTorches();
	this.addFuel();
	this.addFlyHives();
	this.addFireflies();

	this.tick = function (gimble) {
		for (var i = 0; i < this.tickers.length; i++) {
			var ts = this.tickers[i].tick();
			if (ts) {
				console.log(ts);
				this.flies = this.flies.concat(ts);
			}
		}

		var rx = Math.random() * this.width;
		var ry = this.max_j + Math.random() * (this.height - this.max_j);
		if (!this.isAt(rx, ry, function (t) { return t.solid; }) &&
				this.darkAt(rx, ry) && Math.random() < 0.001) {
					console.log('roach!');
					this.flies.push(new Roach(rx, ry));
				}

		for (var i = 0; i < this.flies.length; i++)
			this.flies[i].tick(this, gimble);
	}

	this.draw = function (ctx, cam) {
		ctx.save();

		this.drawBackground(ctx);
		for (var x = cam.x; x < cam.x + WIDTH + SQUARE; x += SQUARE) {
			for (var y = cam.y; y < cam.y + HEIGHT + SQUARE; y += SQUARE) {
				var ts = this.tileAt(x, y);
				for (var i = 0; i < ts.length; i++) {
					ts[i].draw(ctx);
				}
			}
		}

		for (var i = 0; i < this.flies.length; i++) {
			this.flies[i].draw(ctx);
		}

		ctx.restore();
	}

	this.drawDark = function (ctx, cam) {
		ctx.save();

		var lights = this.lights;

		for (var i = 0; i < lights.length; i++) {
			if (!lights[i].emits || lights[i].x + lights[i].emits < cam.x ||
					lights[i].x - lights[i].emits > cam.x + WIDTH ||
					lights[i].y + lights[i].emits < cam.y ||
					lights[i].y - lights[i].emits > cam.y + HEIGHT)
				continue;
			lights[i].drawDark(ctx);
			}

		ctx.restore();
	}

	this.drawBackground = function (ctx) {
	};
}

function Fly (x, y) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;

	this.dazed = 0;

	this.speed = 0.02;
	this.max_speed = 1;
	this.G = 2000;
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = '#555';

		ctx.beginPath();
		ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
		ctx.fill();

		ctx.restore();
	}

	this.tick = function (room, gimble) {
		if (this.dazed > 0) {
			this.dazed--;
			this.vx += Math.random() - 0.5;
			this.vy += Math.random() - 0.5;
		} else {
			var lights = room.lights.slice(0);
			lights.push(gimble);

			var max = 0;
			var mdx = null;
			var mdy = null;
			for (var i = 0; i < lights.length; i++) {
				var light = lights[i];
				if (i < lights.length - 1) {
					var dx = this.x - light.x - SQUARE/2;
					var dy = this.y - light.y - SQUARE/2;
				} else {
					// gimble stores his coordinates differently.
					// i should probably let the tiles store their
					// center coordinates instead of, as it is,
					// their upper left.
					var dx = this.x - light.x;
					var dy = this.y - light.y;
				}
				var mag = Math.sqrt(dist2(dx, dy, 0, 0));
				if (mag < 1) {
					this.dazed = 32;
					light.damage(Math.random() * 8);
					break;
				}
				dx *= this.G * light.emits / mag / mag / mag;
				dy *= this.G * light.emits / mag / mag / mag;
				var mag = Math.sqrt(dist2(dx, dy, 0, 0));
				if (mag > max) {
					mdx = sign(dx);
					mdy = sign(dy);
					max = mag;
				}
			}
			this.vx -= mdx;
			this.vy -= mdy;
		}

		var mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		if (mag > this.max_speed) {
			this.vx = this.vx * this.max_speed / mag;
			this.vy = this.vy * this.max_speed / mag;
		}

		this.x += this.vx;
		if (room.isAt(this.x, this.y, function (t) { return t.solid; })) {
			this.vx = -this.vx;
			this.x += this.vx;
			this.dazed = 8;
		}
		this.y += this.vy;
		if (room.isAt(this.x, this.y, function (t) { return t.solid; })) {
			this.vy = -this.vy;
			this.y += this.vy;
			this.dazed = 8;
		}
	}
}

function Firefly (x, y, height) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.height = height;
	this.on = true;
	Object.defineProperty(this, 'emits', {
		get: function () { return 15 * this.on; }
	});

	this.tick = function (room, gimble) {
		this.vy += grav;

		/*
		var mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		if (mag > this.max_speed) {
			this.vx = this.vx * this.max_speed / mag;
			this.vy = this.vy * this.max_speed / mag;
		}
		*/

		if (this.y > this.height) {
			this.vy -= 1.5*grav;
		}

		this.vx += Math.random() - 0.5;

		if (Math.random() < 0.1)
			this.on = !this.on;
	}

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'white';

		ctx.beginPath();
		ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
		ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI, false);
		ctx.fill();

		ctx.restore();
	}

	this.drawDark = function (ctx) {
		if (!this.on) return;

		console.log('hello');

		ctx.save();

		var grd = ctx.createRadialGradient(this.x, this.y, 0,
				this.x, this.y, this.emits);
		grd.addColorStop(0, 'rgba(255, 255, 127, '+1+')');
		grd.addColorStop(1, 'rgba(255, 255, 127, 0)');
		//ctx.fillStyle = 'rgba(255, 255, 127, ' + (i / 120) + ')';
		ctx.fillStyle = grd;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.emits, 0, 2 * Math.PI,false);

		ctx.restore();
	}
}

function Roach (x, y) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;

	this.radius = SQUARE / 16;

	this.jump = -4;
	this.jumps = 0;
	this.G = 2000;

	this.speed = .2;
	this.chasing = false;
	this.grounded = false;
	this.max_vx = 2;
	this.count = 0;
	this.lastCount = 1;

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, Math.PI, 0, false);
		ctx.fill();
		
		ctx.strokeStyle = 'white';
		ctx.lineWidth = this.radius / 2;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x, this.y - this.radius);
		ctx.stroke();

		ctx.restore();
	}

	this.resetCount = function () {
		this.count = 0;
		this.lastCount = 1;
	}

	this.tick = function (room, gimble) {
		if (this.jumps > 0 && this.grounded) {
			this.jumps--;
			this.vy += this.jump;
		}
		this.vy += grav;

		var d = dist2(this.x, this.y, gimble.x, gimble.y);
		if (d < 100000 && Math.abs(this.y - gimble.y) < SQUARE*2) {
			if (!this.chasing) {
				this.resetCount();
				this.jumps = 3;
				this.chasing = true;
			}
			this.vx += sign(gimble.x - this.x) * this.speed;

			if (d < this.radius * this.radius * 2) {
				gimble.leak += 0.001;
				gimble.flicker = true;
			}
		} else {
			if (this.chasing) this.vx = 0;
			this.chasing = false;
			this.jumps = 0;

			if (room.darkAt(this.x, this.y)) {
				this.resetCount();
			} else {
				if (this.count > 0) {
					this.count--;
				} else {
					this.lastCount *= 2;
					this.count = this.lastCount;
					var lights = room.lights;
					var max = 0;
					this.mdx = null;
					var mdy = null;
					for (var i = 0; i < lights.length; i++) {
						var light = lights[i];
						var dx = this.x - light.x - SQUARE/2;
						var dy = this.y - light.y - SQUARE/2;
						var mag = Math.sqrt(dist2(dx, dy, 0, 0));

						dx *= this.G * light.emits / mag / mag / mag;
						dy *= this.G * light.emits / mag / mag / mag;

						var mag = Math.sqrt(dist2(dx, dy, 0, 0));
						if (mag > max) {
							this.mdx = sign(dx);
							mdy = sign(dy);
							max = mag;
						}
					}
				}

				if (this.count > this.lastCount / 2) this.vx += this.mdx;
			}
		}
		if (Math.abs(this.vx) > this.max_vx) {
			this.vx = sign(this.vx) * this.max_vx;
		}
		if (!this.chasing) {
			this.vx *= .9;
		}

		this.x += this.vx;
		if (this.vx > 0) {
			var collision = room.isAt(this.x + this.radius, this.y, function (x) {
				return x.solid;
			});
			if (collision) {
				this.vx = 0;
				this.x = collision.x - this.radius;
			}
		} else if (this.vx < 0) {
			var collision = room.isAt(this.x - this.radius, this.y, function (x) {
				return x.solid;
			});
			if (collision) {
				this.vx = 0;
				this.x = collision.x + SQUARE + this.radius;
			}
		}

		this.grounded = false;
		this.y += this.vy;
		if (this.vy > 0) {
			var collision = room.isAt(this.x, this.y, function (x) {
				return x.solid || (x.type == 'bridge' && x.y>this.y-this.vy);
			}.bind(this));

			if (collision) {
				this.vy = 0;
				this.y = collision.y - grav/2;
				this.grounded = true;
			}
		} else if (this.vy < 0) {
			var collision = room.isAt(this.x, this.y, function (x) {
				return x.solid;
			});
			if (collision) {
				this.y = collision.y + SQUARE;
				this.vy = 0;
			}
		}
	}

}

function Crawlie (x, y) {
	this.x = x;
	this.y = y;

	this.vx = 0;
	this.vy = 0;

	this.speed = 0.1;

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = '#00f';

		ctx.beginPath();
		ctx.arc(this.x, this.y, 16, 0, 2 * Math.PI, false);
		ctx.fill();

		ctx.restore();
	}

	this.tick = function (gimble) {
		if (this.x > gimble.x) this.vx -= this.speed;
		if (this.x < gimble.x) this.vx += this.speed;
		if (this.y > gimble.y) this.vy -= this.speed;
		if (this.y < gimble.y) this.vy += this.speed;

		this.vx /= 2;
		this.vy /= 2;

		this.x += this.vx;
		this.y += this.vy;
	}
}

function sign (x) {
	if (x > 0) return 1;
	if (x < 0) return -1;
	return 0;
}

function Gimble (x, y) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;

	this.fuel = 512;
	this.max_fuel = 512;
	this.leak = 0;

	this.cast_x = 0;
	this.cast_y = 0;

	this.width = 8;
	this.height = 8;

	this.run = .4;
	this.max_vx = 4;

	this.jumpv = -9;

	this.grounded = false;

	this.keep = 30;
	this.oldLocs = [];

	this.size = 1;
	Object.defineProperty(this, 'emits', {
		get: function () {
			return this.size * this.keep * 60;
		}
	});

	Object.defineProperty(this, 'jump', {
		get: function () { return this.keys[38] || this.keys[32]; }
	});
	Object.defineProperty(this, 'down', {
		get: function () { return this.keys[40] || this.keys[87]; }
	});
	Object.defineProperty(this, 'left', {
		get: function () { return this.keys[37] || this.keys[72]; }
	});
	Object.defineProperty(this, 'right', {
		get: function () { return this.keys[39] || this.keys[84]; }
	});
	Object.defineProperty(this, 'shift', {
		get: function () { return this.keys[16]; }
	});

	this.tick = function (room) {
		this.fuel -= this.leak;
		if (this.fuel < 0) this.fuel = 0;
		if (this.fuel > this.max_fuel) this.fuel = this.max_fuel;

		this.oldLocs.push({
			x: this.x + this.width/2 + this.cast_x, 
			y: this.y + this.height/2 + this.cast_y,
			size: this.size
		});
		if (this.oldLocs.length > this.keep) {
			this.oldLocs = this.oldLocs.slice(1);
		}
		if (!this.grounded) this.vy += grav;

		if (this.left) this.vx -= this.run;
		else if (this.right) this.vx += this.run;
		else if (this.grounded) this.vx = 0;
		if (this.jump && this.grounded) this.vy += this.jumpv;
		else if (!this.jump && !this.grounded && this.vy < 0) this.vy /= 2;
		if (this.shift && this.fuel > 0) {
			this.size += 0.02 * Math.log(2 * HEIGHT - this.y);
			this.fuel--;
		} else this.size -= 0.1;
		if (this.size > 1) this.size *= .99;
		else this.size = 1;

		var max = this.max_vx;
		if (Math.abs(this.vx) > max)
			this.vx = sign(this.vx) * max;

		this.x += this.vx;
		if (this.vx > 0) {
			var collisions = room.tileAt(this.x + this.width, this.y)
				.concat(room.tileAt(this.x + this.width, this.y + this.height - 1));
			for (var i = 0; i < collisions.length; i++) {
				if (!collisions[i].solid) continue;
				this.x = collisions[i].x - this.width - 1;
				this.vx = 0;
			}
		} else if (this.vx < 0) {
			var collisions = room.tileAt(this.x, this.y)
				.concat(room.tileAt(this.x, this.y + this.height - 1));
			for (var i = 0; i < collisions.length; i++) {
				if (!collisions[i].solid) continue;
				this.x = collisions[i].x + SQUARE;
				this.vx = 0;
			}
		}

		this.y += this.vy;
		this.grounded = false;
		var collisions = room.collide(this.x, this.y, this.width, this.height);
		var lastCollisions = room.collide(this.x, this.y - this.vy,
				this.width, this.height);

		for (var i = 0; i < collisions.length; i++) {
			var collision = collisions[i];
			if (!collision) continue;

			if (this.vy > 0) {
				if (collision.solid || 
						(collision.type == 'bridge' &&
						 lastCollisions.indexOf(collision) < 0 &&
						 !this.down)) {
					this.y = collision.y - this.height - grav/2;
					this.vy = 0;
					this.grounded = true;
				}
			} else if (this.vy < 0) {
				if (collision.solid) {
					this.y = collision.y + SQUARE;
					this.vy = 0;
				}
			}

			if (collision.type == 'torch') {
				if (this.fuel > 0) {
					collision.light();
				}
			}

			if (collision.fuel) this.fuel += collision.fuel;

			if (collision.type == 'fly hive') {
				collision.kill = true;
			}
		}
	}

	this.damage = function (n) {
		this.fuel -= n;
	}

	this.drawDark = function (ctx) {
		if (this.flicker) {
			this.flicker = false;
			return;
		}
		ctx.save();
		for (var i = 0; i < this.oldLocs.length; i++) {
			var loc = this.oldLocs[i];
			var r = i * loc.size * 30 / this.keep;
			var grd = ctx.createRadialGradient(loc.x, loc.y, 0,
					loc.x, loc.y, r);
			grd.addColorStop(0, 'rgba(255, 255, 127, '+(2/this.keep)+')');
			grd.addColorStop(1, 'rgba(255, 255, 127, 0)');
			//ctx.fillStyle = 'rgba(255, 255, 127, ' + (i / 120) + ')';
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(this.oldLocs[i].x, this.oldLocs[i].y, r, 0, 2 * Math.PI,false);
			ctx.fill();
		}
		ctx.restore();
	}
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'white';
		ctx.shadowBlur = 16;
		ctx.shadowColor = 'white';
		ctx.fillRect(this.x, this.y, 8, 8);

		ctx.restore();
	}
	this.drawStats = function (ctx) {
		ctx.save();

		//var number = Math.min(Math.floor(this.fuel / this.max_fuel * 512), 255);
		//var color = 'rgb(255,' + number + ',' + number + ')';
		var color = 'white';
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.lineWidth = 4;
		ctx.font = '12pt courier';
		ctx.textAlign = 'left';
		ctx.fillText('fuel:', 12, 42);
		ctx.fillRect(72, 24, this.fuel / this.max_fuel * 128, 24);
		ctx.strokeRect(72, 24, 128, 24);
		
		ctx.restore();
	}

	this.keys = {};

	addEventListener('keydown', function (e) {
		this.keys[e.keyCode] = true;
	}.bind(this));
	addEventListener('keyup', function (e) {
		this.keys[e.keyCode] = false;
	}.bind(this));
}
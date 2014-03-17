var SQUARE = 64;
var grav = 0.2;

function dist2(x1, y1, x2, y2) {
	return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
Array.prototype.remove = function (x) {
	var i = this.indexOf(x);
	if (i < 0) return;
	this.splice(i, 1);
}

function Tile (x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color || '#333';
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, SQUARE + .6, SQUARE);

		ctx.restore();
	}
}

function WallTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'wall';
	this.solid = true;
	this.niceTop = true;
}
function BadWallTile (x, y) {
	this.__proto__ = new WallTile(x, y);
	this.niceTop = false;
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
	this.everLit = false;

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

		if (this.emits > 0)  {
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

	this.tick = function (dt) {
		var m = dt / 16.67;
		this.emits -= 0.05 * m;
		if (this.emits < 0) this.emits = 0;
	}

	this.damage = function (n) {
		this.emits-=n;
	}

	this.light = function () {
		this.emits = this.lighter;
		this.everLit = true;
	}
}
function SmallTorchTile (x, y) {
	this.__proto__ = new TorchTile(x, y, 32);
}

function FuelCellTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'fuel pack';
	this.collectable = function (gimble) {
		gimble.spendFuel(-128);
		return "+fuel";
	}
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'blue';
		ctx.fillRect(this.x + 3 * SQUARE/8, this.y + 3 * SQUARE/8,
				SQUARE/4, SQUARE/4);

		ctx.restore();
	}
}
function EverLightTile (x, y) {
	this.__proto__ = new TorchTile(x, y);
	this.type = 'ever light';
	this.emits = 512;
	this.gradient = function (ctx) {
		var grd=ctx.createRadialGradient(this.x + SQUARE/2, this.y + SQUARE/2, 0,
				this.x + SQUARE/2 + Math.random() * SQUARE/2 - SQUARE/4,
				this.y + SQUARE/2 + Math.random() * SQUARE/2 - SQUARE/4,
				this.emits);
		var op = 1/3;
		grd.addColorStop(0, 'rgba(0, 255, 0, ' + op + ')');
		grd.addColorStop(1, 'rgba(0, 255, 0, 0)');
		return grd;
	}

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = '#0f0';
		var unit = SQUARE / 8;
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.beginPath();
		ctx.moveTo(-unit, 0);
		ctx.lineTo(0, -unit);
		ctx.lineTo(unit, 0);
		ctx.lineTo(0, unit);
		ctx.fill();
		
		ctx.restore();
	}

	this.tick = function () {};
	this.damage = function () {};
}
function WallJumpTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'wall jump';
	this.collectable = function (gimble) {
		gimble.abilities.wallJump = true;
	}
	var unit = SQUARE / 8;
	this.draw = function (ctx) {
		ctx.save();
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.lineWidth = unit / 2;
		ctx.beginPath();
		ctx.arc(-2*unit, -2*unit, 2*unit, 3 * Math.PI / 4, false);
		ctx.arc(-2*unit, 2*unit, 2*unit, 0, Math.PI / 4, false);
		ctx.moveTo(-2*unit, -2*unit);
		ctx.lineTo(-2*unit, 2*unit);
		ctx.stroke();
	}
}
function DoubleJumpTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'wall jump';
	this.collectable = function (gimble) {
		gimble.abilities.doubleJump = true;
	}
	var unit = SQUARE / 8;
	this.draw = function (ctx) {
		ctx.save();
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.lineWidth = unit / 2;
		ctx.beginPath();
		ctx.arc(0, 2*unit, 2*unit, 0, Math.PI / 4, false);
		ctx.arc(-2*unit, 0, 2*unit, 0, Math.PI / 4, false);
		ctx.stroke();
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

function FuelCanisterTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'fuel canister';
	this.collectable = function (gimble) {
		gimble.max_fuel += 64;
		return '+max fuel';
	}
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'blue';
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		var unit = SQUARE/4;
		ctx.beginPath();
		ctx.moveTo(-unit, unit);
		ctx.lineTo(-unit, 0);
		ctx.arc(0, 0, unit, Math.PI, 0, false);
		ctx.lineTo(unit, unit);
		ctx.lineTo(-unit, unit);
		ctx.fill();

		ctx.restore();
	}
}

function CandyTile (x, y) {
	this.__proto__ = new Tile(x, y);
	this.type = 'candy';
	this.collectable = function (gimble) {
		gimble.fear = 0;
		gimble.points += 20;
		return 'yum +20';
	}
	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'white';
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.beginPath();
		ctx.arc(0, 0, SQUARE/8, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.strokeStyle = 'red';
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(-SQUARE/16, -SQUARE/16);
		ctx.lineTo(SQUARE/16, SQUARE/16);
		ctx.stroke();

		ctx.restore();
	}
}

function FlyHiveTile (x, y) {
	this.__proto__ = new Tile(x, y, '#330');
	this.type = 'fly hive';
	this.solid = false;
	
	this.tick = function (dt) {
		var m = dt / 16.67;
		if (Math.random() < 0.001 * m) {
			return new Fly (this.x + SQUARE/2, this.y + SQUARE/2);
		}
	}

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = '#330';
		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.beginPath();
		ctx.lineTo(SQUARE/2, SQUARE/2);
		ctx.lineTo(-SQUARE/2, SQUARE/2);
		ctx.fill();
		ctx.restore();
	}
}

function BarrierDoorTile (x, y, barrier) {
	this.__proto__ = new Tile(x, y);
	this.barrier = barrier;
	this.draw = function (ctx) {
		ctx.save();

		ctx.translate(this.x + SQUARE / 2, this.y + SQUARE / 2);
		ctx.beginPath();
		ctx.moveTo(-SQUARE/2, SQUARE/2);
		ctx.lineTo(-SQUARE/2, 0);
		ctx.arc(0, 0, SQUARE/2, Math.PI, 0, false);
		ctx.lineTo(SQUARE/2, SQUARE/2);
		ctx.fill();

		if (this.barrier) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = this.barrier.color;
			ctx.beginPath();
			ctx.arc(0, 0, SQUARE/8, 0, Math.PI * 2, false);
			ctx.stroke();
		}

		ctx.restore();
	}

	this.enter = function (complex, gimble) {
		if (!this.barrier) {
			complex.changeRoom(this.link, gimble);
			return;
		}
		if (gimble.doorKeys.indexOf(this.barrier.color) >= 0) {
			gimble.doorKeys.remove(this.barrier.color);
			this.barrier = false;
			complex.rooms[this.link.id].isAt(this.link.x, this.link.y, function (t) {
				if (t.barrier) {
					t.barrier = false;
				}
			});
		}
	}

	this.link = {
		id: 0,
		x: 2 * SQUARE,
		y: HEIGHT * 2 - 2 * SQUARE
	}
}

function BarrierTile (x, y, color) {
	this.__proto__ = new Tile(x, y);
	this.color = color;

	this.draw = function (ctx, d) {
		ctx.save();

		ctx.translate(this.x + SQUARE/2, this.y + SQUARE/2);
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(0, 0, SQUARE/8, 0, Math.PI*2, false);
		ctx.fill();

		ctx.restore();
	}
	this.collected = false;

	this.collectable = function (gimble) {
		if (this.collected) return;
		this.collected = true;
		gimble.doorKeys.push(this.color);
	}
}

function ExitTile (x, y) {
	this.__proto__ = new BarrierDoorTile(x, y);
	this.color = 'white';
	this.emits = 256;

	this.draw = function (ctx) {
		ctx.save();

		ctx.shadowBlur = 16;
		ctx.fillStyle = 'white';
		ctx.translate(this.x + SQUARE / 2, this.y + SQUARE / 2);
		ctx.beginPath();
		ctx.moveTo(-SQUARE/2, SQUARE/2);
		ctx.lineTo(-SQUARE/2, 0);
		ctx.arc(0, 0, SQUARE/2, Math.PI, 0, false);
		ctx.lineTo(SQUARE/2, SQUARE/2);
		ctx.fill();

		if (this.barrier) {
			ctx.fillStyle = this.barrier.color;
			ctx.fillRect(-SQUARE/8, -SQUARE/8, SQUARE/4, SQUARE/4);
		}

		ctx.restore();
	}

	this.drawDark = function (ctx) {
		ctx.save();
		var grd = ctx.createRadialGradient(this.x + SQUARE/2, this.y + SQUARE/2, 0,
				this.x + SQUARE/2, this.y + SQUARE/2, this.emits);
		grd.addColorStop(0, 'rgba(255, 255, 127, .5)');
		grd.addColorStop(1, 'rgba(255, 255, 127, 0)');
		ctx.fillStyle = grd;
		ctx.beginPath();
		ctx.arc(this.x + SQUARE/2, this.y + SQUARE/2, this.emits, 0, 2 * Math.PI,false);
		ctx.fill();
		ctx.restore();
	}
	
	this.link = {
		id: -1,
	};
	
	this.damage = function () {};
}

function Room (i, w, h, numRooms) {
	this.id = i;
	this.width = w;
	this.height = h;
	this.tiles = {};
	this.lights = [];
	this.tickers = [];
	this.flies = [];
	this.niceTops = [];

	this.x = 2 * SQUARE;
	this.y = HEIGHT * 2 - 2 * SQUARE;

	this.addTile = function (Type, i, j) {
		var t = new Type(i * SQUARE, j * SQUARE);
		this.add(t, i, j);
	}

	this.add = function (t, i, j) {
		var coords = i + ',' + j;
		if (!this.tiles.hasOwnProperty(coords))
			this.tiles[coords] = [];
		t.x = i * SQUARE;
		t.y = j * SQUARE;
		t.i = i;
		t.j = j;
		if (t.tick) this.tickers.push(t);
		if (t.emits != undefined) this.lights.push(t);
		if (t.niceTop) {
			this.niceTops.push(t);
		}
		this.tiles[coords].push(t);
	}

	this.addAt = function (t, x, y) {
		this.add(t, Math.floor(x / SQUARE), Math.floor(y / SQUARE));
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

	this.removeAt = function (x, y, tile) {
		var ts = this.tileAt(x, y);
		ts.remove(tile);
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

	this.niceRandom = function () {
		while (true) {
			var t = choice(this.niceTops);
			if (!this.is(t.i, t.j-1, function () { return true; })) {
				return t;
			}
		}
	}

	this.addWalls = function () {
		for (var j = this.max_j; j < this.height; j++) {
			this.addTile(BadWallTile, 0, j);
			this.addTile(BadWallTile, this.width, j);
		}
		for (var i = 0; i < this.width; i++) {
			this.addTile(WallTile, i, this.height-1);
			this.addTile(BadWallTile, i, this.max_j);
		}
	}

	this.addRow = function (j, reachable) {
		this.max_j = j;
		var row = reachable.slice(0);
		// walls = 1
		for (var i = 0; i < reachable.length; i++) {
			row[i] = 0;
			if (reachable[i]) {
				for (var n = -2; n < 3 && i + n < row.length; n++) {
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
			for (var i = 1; i < row.length - 1; i++) {
				if (row[i] && !row[i+1] || !row[i] && row[i+1]) {
					done = false;
					break;
				}
			}
		}
		for (var i = 0; i < this.niceTops.length; i++) {
			while (this.niceTops[i] && this.niceTops[i].j-1 < this.max_j) {
				this.niceTops.splice(i, 1);
			}
		}

		return j;
	}

	this.addTorches = function () {
		var offset = this.height-2;
		var chance = .4;
		var chance_m = .4;

		while (offset > this.max_j) {
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
					&& j > this.max_j && Math.random() < 0.04)
				this.addTile(Math.random() < 0.3? FuelTile: FuelCellTile, i, j-1);
		}
	}

	this.addFuelCanisters = function () {
		for (var i = 0; i < this.width * (this.height - this.max_j) / 2048; i++) {
			var t = this.niceRandom();
			this.addTile(FuelCanisterTile, t.i, t.j - 1);
		}
	}

	this.addCandies = function () {
		for (var i = 0; i < this.width * (this.height - this.max_j) / 1024; i++) {
			var t = this.niceRandom();
			this.addTile(CandyTile, t.i, t.j - 1);
		}
	}

	this.addFlyHives = function () {
		for (var k = 0; k < this.width * (this.height - this.max_j) / 1024; k++) {
			var t = choice(this.niceTops);
			this.addTile(FlyHiveTile, t.i, t.j - 1);
		}
	}

	this.addDoor = function (link_id, complex, barrier) {
		var t = this.niceRandom();

		var p = complex.rooms[link_id].niceRandom();

		var ti = new BarrierDoorTile(0, 0, barrier);
		ti.link.id = link_id;
		this.add(ti, t.i, t.j-1);

		var pi = new BarrierDoorTile(0, 0, barrier);
		pi.link.id = this.id;
		complex.rooms[link_id].add(pi, p.i, p.j-1);

		ti.link.x = pi.x + SQUARE/2;
		ti.link.y = pi.y + SQUARE/2;
		pi.link.x = ti.x + SQUARE/2;
		pi.link.y = ti.y + SQUARE/2;

		return ti.barrier;
	}

	this.addBarrier = function () {
		var t = this.niceRandom();

		var barrier = choice([new BarrierTile(0, 0, 'red'), new BarrierTile(0, 0, 'cyan'), new BarrierTile(0, 0, 'green')]);

		this.add(barrier, t.i, t.j-1);
		return barrier;
	}

	this.addUtility = function () {
		var t = this.niceRandom();
		var utility = choice([new WallJumpTile(0, 0), new DoubleJumpTile(0, 0)]);
		this.add(utility, t.i, t.j-1);
		return utility;
	}

	this.addExit = function () {
		var t = this.niceRandom();
		this.addTile(ExitTile, t.i, t.j-1);
	}

	this.addEverLight = function () {
		var t = this.niceRandom();
		this.addTile(EverLightTile, t.i, t.j-1);
	}

	this.addFireflies = function () {
		for (var i = 0; i < this.width * (this.height - this.max_j) / 512; i++) {
			var t = this.niceRandom();
			var x = t.i * SQUARE + SQUARE/2;
			var y = t.j * SQUARE + SQUARE/2 - SQUARE;
			var f = new Firefly(x, y, y);
			this.flies.push(f);
			this.lights.push(f);
		}
	}

	this.addRows();
	this.addWalls();
	this.addTorches();
	this.addFuel();
	this.addFlyHives();
	this.addFuelCanisters();
	this.addCandies();
	//this.addFireflies();

	this.tick = function (gimble, dt) {
		for (var i = 0; i < this.tickers.length; i++) {
			var ts = this.tickers[i].tick(dt);
			if (ts) {
				this.flies = this.flies.concat(ts);
			}
		}

		var t = this.niceRandom();
		if (this.darkAt(t.x, t.y) && Math.random() < 0.001) {
			console.log('roach!');
			this.flies.push(new Roach(t.x, t.y - SQUARE));
		}

		for (var i = 0; i < this.flies.length; i++)
			this.flies[i].tick(this, gimble, dt);
	}

	this.draw = function (ctx, cam) {
		ctx.save();

		this.drawBackground(ctx, cam);
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

	this.drawBackground = function (ctx, cam) {
	};
}

function randInt (a, b) {
	return Math.floor(Math.random() * (b - a)) + a;
}
function choice (list) {
	return list[Math.floor(Math.random() * list.length)];
}

function Complex (n) {
	this.rooms = [];
	this.maxLengths = 3;
	this.numberOfNodes = n;
	this.targetNode = this.numberOfNodes - 1;
	this.roomIndex = 0;
	
	this.tick = function (gimble, dt) {
		this.room.tick(gimble, dt);
		for (var i = 0; i < this.rooms.length; i++) {
			if (i == this.roomIndex) continue;
			this.rooms[i].tick(false, dt);
		}
	}

	this.generateRooms = function () {
		for (var i = 0; i < this.numberOfNodes; i++) {
			var w = s * randInt(1, this.maxLengths);
			this.rooms.push(new Room(i, w, s, this.numberOfNodes));
		}
	}

	this.generateGraph = function () {
		var nodes = [];
		// haha javascript
		for (var i = 2; i < this.numberOfNodes-1; i++) nodes.push(i);
		this.reachable = [0, 1];
		this.graph = [[0, 1, -1]];
		while (this.reachable.indexOf(this.targetNode) < 0) {
			var q = randInt(0, this.numberOfNodes);
			if (q) {
				n = choice(nodes);
			} else n = choice(this.reachable);
			p = randInt(0, 2);
			a = choice(this.reachable);
			if (a == n) continue;
			if (p) {
				this.graph.push([a, n, -1]);
			} else this.graph.push([a, n, choice(this.reachable)]);
			if (q) {
				this.reachable.push(n);
				nodes.splice(nodes.indexOf(n), 1);
			}
			if (this.graph.length == 4) nodes.push(this.targetNode);
		}
		var uniqs = {};
		for (var i = 0; i < this.graph.length; i++) {
			uniqs[JSON.stringify(this.graph[i])] = true;
		}
		this.graph = [];
		for (var k in uniqs) {
			this.graph.push(JSON.parse(k));
		}
		this.rooms[choice(this.reachable)].addEverLight();
		console.log('graph generated.');
	}

	this.applyGraph = function () {
		for (var i = 0; i < this.graph.length; i++) {
			var v = this.graph[i];
			console.log('applying', v);
			if (v[2] != -1) {
				var barrier = this.rooms[v[2]].addBarrier();
				this.rooms[v[0]].addDoor(v[1], this, barrier);
				this.graph[i][2] = barrier.color;
			} else {
				this.rooms[v[0]].addDoor(v[1], this);
				this.graph[i][2] = 'black';
			}
		}
		this.rooms[this.targetNode].addExit();
		console.log('graph applied.');
	}

	/*
	this.nodes = {};
	this.makeMap = function () {
		var nodes = [];
		for (var i = 0; i < this.reachable.length; i++) {
			nodes.push({
				id: i,
				x: Math.random(),
				y: Math.random(),
				vx: 0,
				vy: 0,
				fx: 0,
				fy: 0,
			});
		}
		var edges = this.graph;
		
		for (var i = 0; i < 1024; i++) {
			for (var j = 0; j < nodes.length; j++) {
				for (var k = j+1; k < nodes.length; k++) {
					var d = dist2(nodes[j].x, nodes[j].y, nodes[k].x, nodes[k].y);
					var rd = Math.sqrt(d);

					var dx = nodes[j].x - nodes[k].x;
					var dy = nodes[j].y - nodes[k].y;

					dx /= rd * d;
					dy /= rd * d;

					nodes[j].fx += dx;
					nodes[j].fy += dy;
					nodes[k].fx -= dx;
					nodes[k].fy -= dy;
				}
				this.nodes[nodes[j].id] = nodes[j];
			}
			for (var e = 0; e < edges.length; e++) {
				var j = edges[e][0];
				var k = edges[e][1];

				var d = dist2(this.nodes[j].x, this.nodes[j].y, 
						this.nodes[k].x, 
						this.nodes[k].y);
				if (d > 1) {
					var rd = Math.sqrt(d);

					var dx = nodes[j].x - nodes[k].x;
					var dy = nodes[j].y - nodes[k].y;

					dx /= rd * d;
					dy /= rd * d;

					nodes[j].fx -= dx;
					nodes[j].fy -= dy;
					nodes[k].fx += dx;
					nodes[k].fy += dy;
				}
			}
			for (var j = 0; j < nodes.length; j++) {
				nodes[j].fx *= .001;
				nodes[j].fy *= .001;
				nodes[j].vx += nodes[j].fx;
				nodes[j].vy += nodes[j].fy;
				nodes[j].x += nodes[j].vx;
				nodes[j].y += nodes[j].vy;
			}
		}
		var mapMinX = null;
		var mapMinY = null;
		var mapMaxX = null;
		var mapMaxY = null;
		for (var i = 0; i < nodes.length; i++) {
			var x = nodes[i].x;
			var y = nodes[i].y;
			this.nodes[nodes[i].id] = {
				id: nodes[i].id,
				x: x,
				y: y,
			}
			if (x > mapMaxX) mapMaxX = x;
			if (y > mapMaxY) mapMaxY = y;
			if (x < mapMaxX) mapMinX = x;
			if (y < mapMaxY) mapMinY = y;
		}
		this.mapX = mapMinX;
		this.mapY = mapMinY;
		this.mapScaleX = WIDTH / (mapMaxX - mapMinX);
		this.mapScaleY = HEIGHT / (mapMaxY - mapMinY);
	}

	this.drawMap = function (ctx) {
		if (!this.shouldIDrawTheMap) return;
		ctx.save();

		ctx.fillStyle = 'rgba(255,255,255,.2)';
		ctx.fillRect(0, 0, WIDTH, HEIGHT);

		console.log(this.mapX, this.mapY);
		ctx.translate(-this.mapX, -this.mapY);
		//ctx.scale(this.mapScaleX, this.mapScaleY);
		ctx.fillStyle = 'black';
		for (var j = 0; j < this.reachable.length; j++) {
			var n = this.reachable[j];
			ctx.beginPath();
			ctx.arc(n.x, n.y, 16, 0, 2 * Math.PI, false);
			ctx.fill();
		}
		ctx.lineWidth = 2;
		for (var j = 0; j < this.graph.length; j++) {
			var n0 = this.nodes[this.graph[j][0]];
			var n1 = this.nodes[this.graph[j][1]];
			ctx.beginPath();
			ctx.moveTo(n0.x, n0.y);
			ctx.lineTo(n1.x, n1.y);
			ctx.stroke();
		}

		ctx.restore();
	}
	*/

	this.generate = function () {
		this.generateRooms();
		this.generateGraph();
		this.applyGraph();
		//this.makeMap();
	}
	this.generate();

	Object.defineProperty(this, 'room', {
		get: function () {
			return this.rooms[this.roomIndex];
		}
	});

	this.win = function () {
		console.log('good job!');
		counter = 480;
		paused = true;
		win = true;
		won = true;
	}

	this.changeRoom = function (link, gimble) {
		if (link.id == this.roomIndex) return;
		if (link.id == -1) {
			this.win();
			return;
		}
		this.roomIndex = link.id;
		gimble.moveTo(link.x, link.y);
	}
}

function Message (x, y, content) {
	this.x = x;
	this.y = y;
	this.vy = -0.5;
	this.content = content;
	this.opacity = 1;
	this.dopacity = -.01;

	this.done = false;

	this.tick = function () {
		if (this.done) return;
		this.y += this.vy;
		this.opacity += this.dopacity;
		if (this.opacity < 0) this.done = true;
	}

	this.draw = function (ctx) {
		if (this.done) return;
		ctx.save();

		ctx.shadowBlur = 4;
		ctx.shadowColor = 'white';
		ctx.fillStyle = 'rgba(255, 255, 255, '+this.opacity+')';
		ctx.font = '12pt courier';
		ctx.textAlign = 'center';
		ctx.fillText(this.content, this.x, this.y);

		ctx.restore();
	}
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

	this.tick = function (room, gimble, dt) {
		var m = dt / 16.67;
		if (this.dazed > 0) {
			this.dazed -= m;
			this.vx += (Math.random() - 0.5) * m;
			this.vy += (Math.random() - 0.5) * m;
		} else {
			var lights = room.lights.slice(0);
			if (gimble) lights.push(gimble);

			var max = 0;
			var mdx = null;
			var mdy = null;
			for (var i = 0; i < lights.length; i++) {
				var light = lights[i];
				if (i < lights.length - 1 || !gimble) {
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

		this.x += this.vx * m;
		if (room.isAt(this.x, this.y, function (t) { return t.type != 'fly hive' && t.solid; })) {
			this.vx = -this.vx;
			this.x += this.vx;
			this.dazed = 8;
		}
		this.y += this.vy * m;
		if (room.isAt(this.x, this.y, function (t) { return t.type != 'fly hive' && t.solid; })) {
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
	this.vvx = 0;
	this.vvy = 0;
	this.height = height;
	this.max_speed = 2;
	this.speed = 0.05;
	this.on = 1;
	Object.defineProperty(this, 'emits', {
		get: function () { return 64 * this.on; }
	});

	this.tick = function (room, gimble, dt) {
		/*
		*/

		this.vx += (Math.random() - .5) * this.speed;
		this.vy += (Math.random() - .5) * this.speed;
		this.x += this.vx;
		if (room.isAt(this.x, this.y, function (t) { return t.solid; })) {
			this.vx = -this.vx;
			this.x += this.vx;
		}
		this.y += this.vy;
		if (room.isAt(this.x, this.y, function (t) { return t.solid; })) {
			this.vy = -this.vy;
			this.y += this.vy;
		}
	}

	this.draw = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'white';

		ctx.beginPath();
		ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
		ctx.fill();

		ctx.restore();
	}

	this.drawDark = function (ctx) {
		if (!this.on) return;
		ctx.save();

		var grd = ctx.createRadialGradient(this.x, this.y, 0,
				this.x, this.y, this.emits);
		grd.addColorStop(0, 'rgba(255, 255, 255, '+.3+')');
		grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
		//ctx.fillStyle = 'rgba(255, 255, 127, ' + (i / 120) + ')';
		ctx.fillStyle = grd;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.emits * 64, 0, 2 * Math.PI,false);
		ctx.fill();

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

	this.tick = function (room, gimble, dt) {
		var m = dt / 16.67;
		if (this.jumps > 0 && this.grounded) {
			this.jumps--;
			this.vy += this.jump;
		}
		this.vy += grav * m;

		var d = 1000000;
		if (gimble) d = dist2(this.x, this.y, gimble.x, gimble.y);
		if (d < 100000 && Math.abs(this.y - gimble.y) < SQUARE*2) {
			if (!this.chasing) {
				this.resetCount();
				this.jumps = 3;
				this.chasing = true;
			}
			this.vx += sign(gimble.x - this.x) * this.speed * m;

			if (d < this.radius * this.radius * 8) {
				console.log('roach hit!');
				gimble.leak += 0.004 * m;
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

		this.x += this.vx * m;
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
		this.y += this.vy * m;
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

function sign (x) {
	if (x > 0) return 1;
	if (x < 0) return -1;
	return 0;
}

function Gimble (x, y, fake) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;

	this.fear = 0;
	this.max_fear = 512;
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
		get: function () { return this.keys[32]; }
	});
	Object.defineProperty(this, 'up', {
		get: function () { return this.keys[38] || this.keys[67]; }
	});
	this.pressedUp = false;
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

	this.spendFuel = function (f) {
		this.fuel -= f;
		if (this.fuel > this.max_fuel) this.fuel = this.max_fuel;
		else if (this.fuel < 0) {
			this.afraid(-this.fuel);
			this.fuel = 0;
			return false;
		}
		return true;
	}

	this.afraid = function (n) {
		this.fear += n;
		if (this.fear > this.max_fear) this.die();
		if (this.fear < 0) this.fear = 0;
	}

	this.abilities = {};
	this.inventory = {};
	this.doorKeys = [];
	this.fuelPacks = 0;
	this.sided = 0;
	this.points = 0;

	this.winTick = function () {
		counter--;
		this.y--;
	}

	this.dieTick = function () {
		counter--;
		this.y++;
	}

	this.tick = function (complex, dt) {
		var m = dt / 16.67;
		if (complex.room.darkAt(this.x, this.y)) {
			if (!this.shift || this.fuel <= 0) this.afraid(0.4 * m);
		} else this.afraid(-0.4 * m);
		this.spendFuel(this.leak * m);

		this.oldLocs.push({
			x: this.x + this.width/2 + this.cast_x, 
			y: this.y + this.height/2 + this.cast_y,
			size: this.size
		});
		if (this.oldLocs.length > this.keep) {
			this.oldLocs = this.oldLocs.slice(1);
		}
		if (!this.grounded) this.vy += grav * m;

		if (this.left) this.vx -= this.run * m;
		else if (this.right) this.vx += this.run * m;
		else if (this.grounded) this.vx = 0;
		if (this.jump) {
			if (this.grounded) this.vy += this.jumpv;
			/*
			else if (this.abilities.doubleJump && !this.doubleJumped) {
				this.vy = Math.min(this.vy, this.jumpv);
				this.doubleJumped = true;
			}
			if (this.abilities.wallJump && this.sided) {
				this.vy = Math.min(this.vy, this.jumpv);
				this.vx = -this.sided * this.max_vx;
			}
			*/
		}

		else if (!this.jump && !this.grounded && this.vy < 0) this.vy /= 2;
		if (this.shift && this.spendFuel(m)) {
			this.size += 0.02 * m * Math.log(2 * HEIGHT - this.y);
		} else this.size -= 0.1 * m;
		if (this.size > 1) this.size *= .99;
		else this.size = 1;

		var max = this.max_vx;
		if (Math.abs(this.vx) > max)
			this.vx = sign(this.vx) * max;

		this.sided = 0;
		this.x += this.vx * m;
		if (this.vx > 0) {
			var collisions = complex.room.tileAt(this.x + this.width, this.y)
				.concat(complex.room.tileAt(this.x + this.width, this.y + this.height - 1));
			for (var i = 0; i < collisions.length; i++) {
				if (!collisions[i].solid) continue;
				this.x = collisions[i].x - this.width - 1;
				this.vx = 0;
				this.sided = 1
			}
		} else if (this.vx < 0) {
			var collisions = complex.room.tileAt(this.x, this.y)
				.concat(complex.room.tileAt(this.x, this.y + this.height - 1));
			for (var i = 0; i < collisions.length; i++) {
				if (!collisions[i].solid) continue;
				this.x = collisions[i].x + SQUARE;
				this.vx = 0;
				this.sided = -1;
			}
		}

		this.y += this.vy * m;
		this.grounded = false;
		var collisions = complex.room.collide(this.x, this.y, this.width, this.height);
		var lastCollisions = complex.room.collide(this.x, this.y - this.vy,
				this.width, this.height);

		for (var i = 0; i < collisions.length; i++) {
			var collision = collisions[i];
			if (!collision) continue;

			if (this.vy > 0) {
				if (collision.solid || 
						(collision.type == 'bridge' &&
						 lastCollisions.indexOf(collision) < 0 &&
						 !this.down)) {
					this.y = collision.y - this.height - 2 * grav;
					this.vy = 0;
					this.grounded = true;
					this.doubleJumped = false;
				}
			} else if (this.vy < 0) {
				if (collision.solid) {
					this.y = collision.y + SQUARE;
					this.vy = 0;
				}
			}

			if (collision.type == 'torch') {
				if (this.fuel > 0) {
					if (!collision.everLit) {
						this.points++;
						complex.room.flies.push(
								new Message(collision.x + SQUARE/2, 
									collision.y + SQUARE / 2,
									'+1'));
					}
					collision.light();
				}
			}

			if (collision.fuel) this.fuel += collision.fuel * m;

			if (collision.collectable) {
				var m = collision.collectable(this);
				if (m) complex.room.flies.push(new Message(collision.x + SQUARE/2,
							collision.y + SQUARE/2,
							m));
				complex.room.removeAt(collision.x, collision.y, collision);
			}

			if (collision.enter && this.up && !this.lastUp) {
				collision.enter(complex, this);
				this.entered = true;
			}
		}

		this.lastUp = this.up;
		if (this.everLight) {
			this.everLight.x = this.x - SQUARE/2;
			this.everLight.y = this.y - SQUARE/2;
			this.everLight.emits--;
			if (this.everLight.emits <= 0) {
				delete this.everLight;
			} else if (this.up && !this.entered) {
				complex.room.addAt(this.everLight, this.x, this.y);
			}
		}
		this.entered = false;
	}

	this.damage = function (n) {
		this.spendFuel(n);
		this.oldLocs[this.oldLocs.length-1].size = 0;
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
		ctx.textAlign = 'right';
		ctx.fillText('points:' + this.points, WIDTH-42, 42);

		ctx.textAlign = 'left';
		ctx.fillStyle = 'red';
		ctx.strokeStyle = 'red';
		ctx.fillText('fear:', 12, 72);
		ctx.fillRect(72, 54, this.fear / this.max_fear * 128, 24);
		ctx.strokeRect(72, 54, 128, 24);
		
		for (var i = 0; i < this.doorKeys.length; i++) {
			ctx.fillStyle = this.doorKeys[i];
			ctx.beginPath();
			ctx.arc(72 + 16 * i + 4, 84 + 4, 4, 0, Math.PI * 2, false);
			ctx.fill();
		}
		ctx.restore();
	}

	this.drawOver = function (ctx) {
		ctx.save();

		ctx.fillStyle = 'white';
		ctx.font = '24pt courier';

		ctx.textAlign = 'center';
		ctx.fillText((win? 'You made it!': 'Game over.'), WIDTH/2, HEIGHT/2 - SQUARE);
		ctx.font = '12pt courier';
		ctx.fillText('You scored ' + this.points + ' points before you', WIDTH/2, HEIGHT/2 + SQUARE/2);
		if (die) {
			ctx.fillText('were driven mad by the swarm!', WIDTH/2, HEIGHT/2 + SQUARE)
		} else {
			ctx.fillText('escaped with your sanity!', WIDTH/2, HEIGHT/2 + SQUARE);
		}

		ctx.fillStyle = 'rgba(255,255,255,' + (1 - (counter / 480)) + ')';
		ctx.fillRect(0, 0, WIDTH, HEIGHT);

		ctx.restore();
	}

	this.die = function () {
		console.log('...aaaAAA!!!');
		paused = true;
		die = true;
		counter = 480;
	}

	this.moveTo = function (x, y) {
		this.vx = 0;
		this.vy = 0;
		this.x = x;
		this.y = y;
		this.oldLocs = [];
	}

	this.keys = {};

	if (!fake) {
		addEventListener('keydown', function (e) {
			this.keys[e.keyCode] = true;
		}.bind(this));
		addEventListener('keyup', function (e) {
			this.keys[e.keyCode] = false;
		}.bind(this));
	}
}

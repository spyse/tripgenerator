Projects = new Meteor.Collection("Projects");

Place = function(pid, name, cars, kmAVG, lat, lng) {
	if(pid === false) pid = Meteor.uuid(); //hack da EJSON manchmal 'false' statt der ID rein schreibt. Ist das der Fall, weiß ich einfach ne neue ID zu.
	this.pid = pid;
	this.name = name;
	this.cars = cars;
	this.kmAVG = kmAVG;
	this.lat = lat;
	this.lng = lng;
};

Place.prototype = {
	constructor: Place,

	clone: function() {
		return new  Place(this.pid, this.name, this.cars, this.kmAVG, this.lat, this.lng);
	},

	equals: function(other) {
		return this.pid = other.pid && this.name === other.name && this.cars === other.cars && this.kmAVG === other.kmAVG && this.lat === other.lat && this.lng === other.lng;
	},

	typeName: function() {
		return "Place";
	},

	toJSONValue: function() {
		return {
			pid: this.pid,
			name: this.name,
			cars: this.cars,
			kmAVG: this.kmAVG,
			lat: this.lat,
			lng: this.lng
		};
	}
};

EJSON.addType("Place", function fromJSONValue(value) {
	return new Place(value.pid, value.name, value.cars, value.kmAVG, value.lat, value.lng);
});

RandomDirections = function(count, maxdist) {
	this.count = count;
	this.maxdist = maxdist;
}

String.prototype.hashCode = function() {
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
};

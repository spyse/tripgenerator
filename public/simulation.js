/**
Simulation in WebWorker

@module Simulation
**/
importScripts('http://underscorejs.org/underscore-min.js');

/**
	Standort-Objekt.

	@class Place
	@constructor
	@param id {Number} Identifier
	@param name {String} Name des Standorts
	@param GMDName {String} Name in googlemaps Directions
	@param cars {Number} Anzahl der Autos für diesen Standort
	@param kmAVG {Number} Durschnittliche Kilometer die Autos dieses Standorts zur Verfügung haben.
**/
function Place(pid, name, GMDName, cars, kmAVG) {
	this.pid = pid;
	this.name = name;
	this.GMDName = GMDName;
	this.cars = cars;
	this.kmAVG = kmAVG;
}

Place.prototype = {
	constructor: Place,

	/**
	Gibt alle Werte des Objekts in einem Satz zurück

	@method toString
	@return {String} "Auto Id von Standort Heimatstandort. Aktueller Standort: aktStandort. Verfügbare Kilometer: 2030km. Gefahrene Kilometer: 1980km (übrig: 50km)"
	**/
	toString: function() {
		return 'Standort ('+this.pid+') '+this.name+' mit '+this.cars+' Autos hat pro Auto im Schnitt '+this.kmAVG+' Kilometer zur Verfügung. GMDirectionsname: '+this.GMDName;
	}
}

/**
 *	Auto-Objekt. Gehört zu einem Standort, besitzt durchschnt. kilometer und wieviel tatsächlich gefahren wurde
 *
 * @class Car
 * @constructor
 * @param name {String} Identifier
 * @param home {String} Heimatstandort
 * @param currentLoc {String} derzeitiger Standort des Autos (Achtung GMDirections Bezeichnung, nicht this.home!)
 * @param kmAVG {Number} Kilometer die dem Auto zur Verfügung stehen
 */
 function Car (name, home, currentLoc, kmAVG) {
 	this.id = _.uniqueId(name+'_');
 	this.home = home;				//Heimstandort
 	this.currentLoc = currentLoc;	//Derzeitige Standort
 	this.kmAVG = parseInt(kmAVG);				//Durchschnittliche zur Verfügung stehende Kilometer
 	this.kmTraveled = 0;			//Kilometer die das auto gefahren
 }

 /**
  *	Car Prototype Functions
  */
 Car.prototype = {
  	constructor: Car,

  	/**
	Gibt dir noch verfügbaren Kilometer zurück. Zieht kmTraveled von kmAVG ab.

	@method availableKM
	@return km {Number}
  	**/
  	availableKM: function() {
  		return Math.round(this.kmAVG - this.kmTraveled);
  	},

  	/**
	Lässt das Auto die übergebene Strecke fahren.

	@method driveDirection
	@param d {Direction} Die zu fahrende Direction (Strecke)
	@return ok {Boolean} Wenn die Strecke nicht gefahren werden kann (zu wenige Kilometer übrig) wird false zurückgegeben. Ansonsten true
  	**/
  	driveDirection: function(d) {
  		if((d.distance.value*0.001) > this.availableKM()) return false;
  		this.currentLoc = d.destination;
  		this.kmTraveled += (d.distance.value*0.001); //meter in kilometer umwandeln
  		//Runden auf 2 kommastelle, damit keine krassen komma stellen entstehen
  		this.kmTraveled = Math.round(this.kmTraveled * 100) / 100;
  		return true;
  	},

  	/**
  	Gibt alle Werte des Objekts in einem Satz zurück

  	@method toString
  	@return satz {String} "Auto Id von Standort Heimatstandort. Aktueller Standort: aktStandort. Verfügbare Kilometer: 2030km. Gefahrene Kilometer: 1980km (übrig: 50km)"
  	**/
  	toString: function() {
  		return 'Auto '+this.id+' von Standort '+this.home+'. Aktueller Standort: '+this.currentLoc+'. Verfügbare Kilometer: '+this.kmAVG+'. Gefahrene Kilometer: '+this.kmTraveled+' (übrig: '+this.availableKM()+')';
  	}
  }

 /**
 Array für alle Cars-Objekte.

 @property carsArray
 @type Array
 **/
 var carsArray = new Array();

/**
Objekt für Routen

@class Direction
@constructor
@param origin {String} Start 
@param destination {String} Ziel
@param distance {Object} Entfernung von Start zu Ziel
  @param distance.text {String} Textuelle beschreibung der Entfernung "20 Kilometer"
  @param distance.value {Number} Zahlenwert in Metern
@param duration {Object} Dauer von Start zu Ziel
  @param duration.text {String} Textuelle beschreibung der Zeit "20 Stunden 18 Minuten"
  @param duration.value {Number} Zahlenwert in Minuten
**/
function Direction (origin, destination, distance, duration) {
	this.origin = origin,
	this.destination = destination,
	this.distance = distance,
	this.duration = duration
};

/**
 *	Direction Prototype Functions
 */
Direction.prototype = {
	constructor: Direction,

	/**
	Gibt alle Werte des Objekts in einem Satz zurück

	@method toString
	@return satz {String} "Von Standort nach Standort sind es 5km (Dauer: 10 min)"
	**/
	toString: function() {
		return 'Von: '+this.origin+' nach '+this.destination+' sind es '+this.distance.text+' (Dauer: '+this.duration.text+')';
	}
};

/**
Array für alle Directions-Objekte.

@property directionsArray
@type Array
**/
var directionsArray = new Array();

/**
Speichert einen Trip ab. Also eine Fahrt die ein Auto gefahren ist.

@class Trip
@constructor
@param car {Car} Auto des Trips
@param d {Direction} Strecke des Trips
@param startTime {Date} Zeitpunkt der Abfahrt
**/
function Trip (car, d, startTime) {
	if (!(car instanceof Car)) throw "car (arg 0) must be of type Car";
	if (!(d instanceof Direction)) throw "d (arg 1) must be of type Direction";
	if (!(startTime instanceof Date)) throw "startTime (arg 2) must be of type Date";
	this.id = _.uniqueId('trip_');
	this.car = car;
	this.direction = d;
	this.startTime = startTime;
	this.endTime = this.calculateEndTime();
}

Trip.prototype = {
	constructor: Trip,

	calculateEndTime: function() {
		var temp = this.startTime.getTime();
		temp += (this.direction.duration.value*1000);
		return new Date(temp);
	},

	toString: function() {
		return 'Trip: '+this.id+'. Auto: '+this.car.id+' fährt die Strecke: '+this.direction.origin+' - '+this.direction.destination+' ('+this.direction.distance.text+'). Start: '+this.startTime+' Ende: '+this.endTime+' ('+this.direction.duration.text+')';
	}
}

/**
Array für alle Trip-Objekte.

@property tripsArray
@type Array
**/
var tripsArray = new Array();

/** 
Berechnung gefahrener Kilometer aller Trips

@method sumUpTrips
@return {String} Insgesamt gefahrene Kilometer aller Trips
**/
sumUpTrips = function() {
	var temp = 0;
	for(var i = 0; i < tripsArray.length; i++) {
		temp += tripsArray[i].direction.distance.value;
	}
	temp *= 0.001;
	return temp;
}

/**
Simulationsklasse. Handelt die Simulation ab.

@class Simulation
@constructor
@param parameters {Object} Enthält die Informationen für die Simulation 
**/
function Simulation (parameters) {
	this.places = parameters.places;
	this.gmDirections = parameters.gmdirections;
};

Simulation.prototype = {
	constructor: Simulation,

	/**
	Startet die Simulation

	@method startSimulation
	**/
	startSimulation: function() {
		self.postMessage({cmd: 'msg', parameters: {text: 'Webworker gestartet...'}});
		this.cleanUpGMDirections(this.gmDirections);
		//Durch alle Standorte iterieren
		for(var i = 0; i < this.places.length; i++) {
			var place = new Place(this.places[i].pid, this.places[i].name, this.gmDirections.originAddresses[i], this.places[i].cars, this.places[i].kmAVG);
			//self.postMessage({cmd: 'msg', parameters: {text: place.toString()}});
			this.simulatePlace(place);
		}
		self.postMessage({cmd: 'msg', parameters: {text: '########### Simulationsende ###########'}});
		self.postMessage({cmd: 'msg', parameters: {text: this.toString()}});
		self.postMessage({cmd: 'data', parameters: {data: JSON.stringify(tripsArray)}});
	},

	/**
	Simuliert für einen übergebenen Standort und dessen Name (als googlemaps Directions Ortsname) Fahrten.
	Dabei wird für jedes Auto des Standorts ein Objekt angelegt. Dann die Durchschnittskilometer +- 20% für jedes auto festgelegt und das Auto "los" geschickt.

	@method simulatePlace
	@param p {Object} Standort
	**/
	simulatePlace: function(p) {
		self.postMessage({cmd: 'msg', parameters: {text: "Simuliere "+p.toString()}});
		for (var i = 1; i <= p.cars; i++) {
			var newCar = new Car(p.pid,p.name, p.GMDName, this.getRandomKMWithRange(p.kmAVG, 20));
			self.postMessage({cmd: 'msg', parameters: {text: 'Auto erzeugt: '+newCar.toString()}});
			carsArray.push(newCar);
			this.simulateCar(newCar);
		}
	},

	/**
	Simmuliert Fahrten für ein übergebenes Auto

	@method simulateCar
	@param car {Car} Das zu simulierende Auto
	**/
	simulateCar: function(car) {
		//Endlosschleife für das Auto. Abbruch wird in der Schleife gehandhabt.
		while(true) {
			//finde directions die als ursprung den aktuellen Standort des Autos haben
			var startDirections = _.filter(directionsArray, function(d) { return d.origin == car.currentLoc; });
			//suche eine random Strecke aus
			var strecke = startDirections[Math.floor(Math.random()*startDirections.length)];
			//Auto die Strecke fahren lassen. Wenn das false zurückgibt, schleife abbrechen.
			if(car.driveDirection(strecke)) {
				//Als Trip abspeichern
				var trip = new Trip(car, strecke, this.getRandomTimeForMonth(6));
				tripsArray.push(trip);
				//Ausgabe Trip
				self.postMessage({cmd: 'msg', parameters: {text: trip.toString()}});
				//Ausgabe Auto
				self.postMessage({cmd: 'msg', parameters: {text: car.toString()}});
				continue;
			} else break;
		}
	},

	/**
	Baut das GoogleMapsDirections Objekt etwas um

	@param d {Object} googlemaps Directions
	**/
	cleanUpGMDirections: function(d) {
		//durch alle "rows"
		for(var i = 0; i < d.rows.length; i++) {
			// durch alle elements
			for(var j = 0; j < d.rows[i].elements.length; j++) {
				// wenn distance === 0 dann origin und destination identisch, also gegenereignis checken
				if(d.rows[i].elements[j].distance.value !== 0) {
					var direction = new Direction(d.originAddresses[i], d.destinationAddresses[j], d.rows[i].elements[j].distance, d.rows[i].elements[j].duration);
					//schiebe DirectionObjekt in directions array.
					directionsArray.push(direction);
				}
			}
		}
	},

	/**
	Gibt einen String für die Simulation aus: Was wurde simmuliert. (Wieviele Standorte, Autos, Strecken usw.)

	@method toString
	@return {String} Es wurden....
	**/
	toString: function() {
		return 'Es wurden '+this.places.length+' Standorte simuliert. Es standen '+directionsArray.length+' Routen zur Vefügung. Es fuhren '+carsArray.length+' Autos '+tripsArray.length+' Touren. Insgesamt '+sumUpTrips()+' km';
	},

	/**
	Liefer eine Date Objekt mit einer zufälligen Uhrzeit für einen Trip. Dabei sind die Zufallswerte gewichtet.

	@method getRandomTimeForMonth
	@param month {Number} monat [1-12], das Jahr ist das aktuelle
	@return {Date} Datum-Objekt mit gesetzer Uhrzeit
	**/
	getRandomTimeForMonth: function(month) {
		var time = new Date();
		time.setMonth(month-1);
		time.setMinutes(0);
		var weightArray = new Array(5,20,24,28,30,35,24,26,28,20,22,20,16,10,4);
		var timeOfDayArray = new Array(6,7,8,9,10,11,12,13,14,15,16,17,18,19,20);

		var weightSum = sum(weightArray);
		var currentLimit = this.getRandomInt(0, weightSum);
		var currentSum = 0;
		for(var i = 0; i < timeOfDayArray.length; i++) {
			currentSum += weightArray[i];
			if(currentSum >= currentLimit) {
				time.setHours(timeOfDayArray[i]);
				return time;
			}
		}
	},

	/**
	Rechnet einen prozentualen Aufschlag (+/-) auf die Kilometer auf

	@method getRandomKMWithRange
	@param {Number} km Die zu grunde liegenden Kilometer
	@param {Number} percentage Der anzurechnende Aufschlaf
	@return {Number} Prozentualer Aufschlag auf die Kilometer
	**/
	getRandomKMWithRange: function(km, percentage) {
		var abweichung = this.getRandomInt((-1)*percentage, percentage);
		return (km + (km*abweichung*0.01));
	},

	/**
	Liefert eine Zufallszahl zwischen min und max

	@method getRandomInt
	@param min {Number} Unteregrenze
	@param max {Number} Oberegrenze
	@return {Number} Zufallszahl zwischen min und max
	**/
	getRandomInt: function(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}	
}

sum = function(array) {
	var sum = 0;
	for(var i = 0; i<array.length;i++) {
		sum += array[i];
	}
	return sum;
}

/**
Webworker Event zur Kommunikation mit dem Parent.

@event message 
@param e {Object} Enthält Kommando und Informationen für das Kommando
**/
self.addEventListener('message', function(e) {
	var data = e.data;
	switch(data.cmd) {
		case 'start':
			var simu = new Simulation(data.parameters);
			simu.startSimulation();
		break;
		case 'abort':
			self.postMessage({cmd: 'msg', parameters: {text: 'Worker stopped'}});
			self.close(); //Beendet den Worker
		break;
		default:
			self.postMessage({cmd: 'msg', parameters: {text: 'Unknown command: '+data.cmd}});
		break;
	}
}, false);
/**
Trip Generator Client

@module Client
**/

/**
Array für alle Standorte des ausgewählten Projekts

@property currentPlaces
@type Array
**/
currentPlaces = new Array();

/**
GoogleMaps Objekt

**/
var map;
var currentMarker;
var markers = new Array();
logger = {};

function log(p) {
  console.log(p);
}

/**
Initiert den Logger

**/
function initLogging() {
  logger = TLog.getLogger();
  logger.setOptions(TLog.LOGLEVEL_MAX, true, false, false);
}

/**
Hochfahren des Clients

* erstellt den Logger (im Developermodus buggy, manchmal muss die Seite neu geladen werden)
* initiert die googleMap
* initiert die Suchbox für googleMap
* erzeugt einen leere Marker für googleMap
* setzt eine Variable zur Erkennung ob das Projekt verändert wurde.

**/
Meteor.startup(function() {
  initLogging();
  initGoogleMaps();
  initGoogleMapsSearchBox();
  currentMarker = new google.maps.Marker({ map: map });
  Session.set('projectmodified', false);
});

/**
Ladet die Projekte in die projects Variable
**/
Template.projectsView.projects = function() {
  return Projects.find();
};

Template.projectsView.formatDate = function(d) {
  if(d) {
    var days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[d.getDay()] + " " + d.getDate() + "." + d.getMonth() + "." + d.getFullYear();
  } else {
    return "Keine Angabe";
  }
};

Template.projectsView.events({
  'click #newProjectBtn': function(e, t) {
    var projname = String(t.find('#newProjectField').value || "");
    if(projname) {
      logger.info("Füge Projekt hinzu");
      Projects.insert({name: projname, createdAt: date});
      t.find('#newProjectField').value = "";
    }
  },
  'keyup #newProjectField': function(e, t) {
    if(e.which === 13) {
      var projname = String(e.target.value || "");
      if(projname) {
        var date = new Date();
        Projects.insert({name: projname, createdAt: date});
        e.target.value = "";
      }
    }
  },
  'click .projectEntry': function(e, t) {
    Session.set('current_project', this._id);
  }
});

Template.maps.events({
  'click #newPlaceBtn': function(e, t) {
    if(isProjectSelected()) {
      var tempPlace = new Place(Meteor.uuid(), currentMarker.get("name"), 15, 1500, currentMarker.getPosition().lat(), currentMarker.getPosition().lng());
      log(tempPlace);
      Projects.update(Session.get("current_project"), {$addToSet: { places: tempPlace}});
      logger.info("Standort hinzugefügt");
      currentMarker.setMap(null);
      document.getElementById('gmSearchTextField').value = "";
    } else {
      console.log("Kein Projekt ausgewählt!");
    }
  }
});

Template.projectInspector.project_selected = function() {
  return isProjectSelected();
};

Template.projectMisc.modified = function() {
  return Session.get('projectmodified');
};

Template.projectMisc.events = ({
  'click button#saveChanges': function(e, t) {
    saveCurrentPlaces();
  },
});

Template.placesTable.places = function() {
  return loadPlacesForCurrentProject();
};

Template.placesTable.rendered = function() {
  var spinnerCars = this.findAll('.spinner-car');
  var spinnerKm = this.findAll('.spinner-km');
  //Alle Auto-Spinner
  for(var i = 0; i < (spinnerCars.length); i++) {
    var element = spinnerCars[i];
    $("#"+element.id+".spinner-car").spinner({value: parseInt((element.getAttribute('data-value') ? element.getAttribute('data-value') : 15))});
    $("#"+element.id+".spinner-car").bind('changed', function(e,v) {
      var place = _.find(currentPlaces, function(pl) { return pl.pid === e.target.id; });
      if(place.cars !== v) {
        place.cars = v;
        Session.set('projectmodified', true);
      }
    });
  }
  //Alle Kilometer-Spinner
  for(var i = 0; i < (spinnerKm.length); i++) {
    var element = spinnerKm[i];
    $("#"+element.id+".spinner-km").spinner({value: parseInt((element.getAttribute('data-value') ? element.getAttribute('data-value') : 1500)), max: 9999, step: 100}); 
    $("#"+element.id+".spinner-km").bind('changed', function(e,v) {
      var place = _.find(currentPlaces, function(pl) { return pl.pid === e.target.id; });
      if(place.kmAVG !== v) {
        place.kmAVG = v;
        Session.set('projectmodified', true);
      }
    });
  }
};

Template.projectInspector.events({
  'click a.removeMarker': removePlace,
  'click a.focusMarker': focusMarker,
  'click #startSimulation': startSimulation,
  'click #saveCheck': function(e, t) {
    if(e.target.checked) {
      Session.set('saveCheck', true);
    }
    else {
      Session.set('saveCheck', false);
    }
  },
  'click #saveToFile': function(e, t) {
    logger.info("Speichere...");
    var blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "hello world.txt");
  }
});

Template.randomDirections.rendered = function() {
  $('#rddspinner').spinner({value: 50, max: 500, step: 10});
  $('#rddspinner').spinner('disable');
  $('#rdcspinner').spinner({value: 5, max: 15, step: 1});
  $('#rdcspinner').spinner('disable');
};

Template.randomDirections.events({
  'click #rdcheck': function(e, t) {
    if(e.target.checked) {
      Session.set('randomDirections', true);
      $('#rddspinner').spinner('enable');
      $('#rdcspinner').spinner('enable');
    }
    else {
      Session.set('randomDirections', false);
      $('#rddspinner').spinner('disable');
      $('#rdcspinner').spinner('disable');
    }
  }
});

// HelferMethoden

function loadPlacesForCurrentProject() {
 if(Session.equals('current_project', null)) return null;
  else {
    logger.info("Hole Projektdetails");
    var project = Projects.findOne({_id: Session.get('current_project')});
    if(project && project.places) {
      clearMarkers();
      markers = new Array();
      for(var i = 0; i < project.places.length; i++) {
        p = project.places[i];
        latlng = new google.maps.LatLng(p.lat, p.lng),
        markers[i] = new google.maps.Marker({
          position: latlng,
          map: map,
          id: p.pid
        });
      }
      currentPlaces = project.places;
      return currentPlaces;
    }
  }
}

function startSimulation(e, t) {
  $('#simulationModal').modal();
  outputMessage("Starte Simulation...");
  outputMessage("Hole googlemaps Directions Daten");
  getGMDirections();
}

/**
 *  Sendet die Orte and den google-Directions Service und schickt die Antwort an ein Callback
 */
function getGMDirections() {
  //var project = Projects.findOne({_id: Session.get('current_project')});
  var oAndD = preparePlacesForGMDirections(currentPlaces);
  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: oAndD[0],
      destinations: oAndD[1],
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    }, GMDirectionsResponse);
}

/** 
 *  Callback für die google-Directions anfrage.
 */
function GMDirectionsResponse(response, status) {
  outputMessage("googlemaps Directions: "+status);
  if(status === "OK") startWebworker(response);
  else outputMessage("googelmaps Directions Fehler. Simulation abgebrochen.");
}

function startWebworker(GMDResponse) {
  var worker = new Worker('simulation.js');
  worker.addEventListener('message', onWorkerMessage, false);
  worker.addEventListener('error', onWorkerError, false);
  worker.postMessage({'cmd': 'start', 'parameters': {gmdirections: GMDResponse, places: currentPlaces}});  
}

/**
 *  Nachricht vom Worker
 */
function onWorkerMessage(e) {
  switch(e.data.cmd) {
    case 'msg':
      outputMessage(e.data.parameters.text);
    break;
    case 'data':
      log(JSON.parse(e.data.parameters.data));
      log(e.data.parameters.data);
      if(Session.get('saveCheck')) {
        var blob = new Blob([e.data.parameters.data], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "simulation.json");
      }
    break;
    default:
      log('Waaatt?');
    break;
  } 
}

function outputMessage(string) {
  logger.info(string, 'Simulation');
  $('#simulationOutputBox').append('<p>'+string+'</p>');
}

function outputError(string) {
  logger.error(string, 'Simulation');
  $('#simulationOutputBox').append('<p font-color="red">'+string+'</p>');
}

/**
 *  Error vom Worker
 */
function onWorkerError(e) {
  outputError(e.data);
}

/**
 *  Verknüpft jeden Standort miteinander und erzeugt ein googleMapsLatLng-Objekt
 */
function preparePlacesForGMDirections(places) {
  if(places) {
    var numberOfPlacesTotal = places.length;
    var origins = new Array();
    var destinations = new Array();
    for (var i = 0; i < places.length; i++) {
      origins.push(new google.maps.LatLng(places[i].lat, places[i].lng));
      destinations.push(new google.maps.LatLng(places[i].lat, places[i].lng));
    }
    //Zufalls strecken generieren
    if(Session.get('randomDirections')) {
      var maxdist = $('#rddspinner').spinner('value');
      var count = $('#rdcspinner').spinner('value');
      for(var j = 0; j < count; j++) {
        //Zufällig Standort wählen um den Ein Zufallspunkt generiert werden soll.
        var rand = getRandomInt(0, places.length-1);
        var startLat = places[rand].lat;
        var startLng = places[rand].lng;
        var rplace = getRandomLatLngAroundCoords(startLat, startLng, maxdist);
        origins.push(new google.maps.LatLng(rplace.lat, rplace.lng));
        destinations.push(new google.maps.LatLng(rplace.lat, rplace.lng));
      }
    }
    return new Array(origins, destinations);
  } else {
    throw "Keine Standorte übergeben";
  }
}

/**
	Berechnet eine zufällige Coorodinate um eine gegebene Coordinate und eine maximale distanz

  Gebaut nach http://www.geomidpoint.com/random/help.html
**/
function getRandomLatLngAroundCoords(lat,lng, maxdist) {
  var startlat = deg2rad(lat);
  var startlon = deg2rad(lng);
  var radiusEarth = 6372.796924;
  maxdist = maxdist / radiusEarth;
  var cosdif = Math.cos(maxdist) - 1;
  var sinstartlat = Math.sin(startlat);
  var cosstartlat = Math.cos(startlat);
  var dist = 0;
  var rad360 = 2 * Math.PI;

  var dist = Math.acos(Math.random() * cosdif + 1);
  var brg = rad360 * Math.random();
  var lat = Math.asin(sinstartlat * Math.cos(dist) + cosstartlat * Math.sin(dist) * Math.cos(brg));
  var lon = rad2deg(normalizeLongitude(startlon * 1 + Math.atan2(Math.sin(brg) * Math.sin(dist) * cosstartlat, Math.cos(dist) - sinstartlat * Math.sin(lat))));
  var lat = rad2deg(lat);

  return {lat: lat, lng: lon};
}

/**
  Wandelt Grad in Rad um
**/
function deg2rad(a) {
	return a * 0.017453292519943295;
}

/**
  Wandelt Rad in Grad um
**/
function rad2deg(a) {
  return a * 57.29577951308232;
}

/**
  Wandelt Längengrad angabe in das richtige Vorzeichen um
**/
function normalizeLongitude(lon) {
  var n=Math.PI;
  if (lon > n) {
    lon = lon - 2*n
  } else if (lon < -n) {
    lon = lon + 2*n
  }
  return lon;
}

/**
  Liefert eine Zufallszahl zwischen min/max
**/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}	

/**
  Speichert die Standorte des derzeitig aktiven Projekts
**/
function saveCurrentPlaces() {
  Projects.update(Session.get("current_project"), {$set: { places: currentPlaces}});
  Session.set('projectmodified', false);
}

/**
  Entfernt einen Platz von den derzeit geladenen Projekt und löscht dieses auch aus der Collection.
**/
function removePlace(e, t) {
  e.preventDefault();
  var pid = e.target.getAttribute('data-projectid');
  currentPlaces = _.reject(currentPlaces, function(p) {
    return p.id === pid;
  });
  saveCurrentPlaces();
};

function focusMarker(e, t) {
  e.preventDefault();
  var mid = e.target.getAttribute('data-markerid');
  var temp = _.find(markers, function(i) {
   return (i.id === mid);
  });
  map.setCenter(temp.getPosition());
  map.setZoom(12);
};

function initGoogleMaps() {
  logger.info("Initialisiere Googlemaps");
  var mapOptions = {
    center: new google.maps.LatLng(49.000, 10.2652),
    zoom: 7,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: false
  };
  map = new google.maps.Map(document.getElementById("googlemaps"), mapOptions);
};

function clearMarkers() {
  for (var i = 0; i < markers.length; i++ ) {
    markers[i].setMap(null);
  }
};

function initGoogleMapsSearchBox() {
  var input = document.getElementById('gmSearchTextField');
  var autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.bindTo('bound', map);

  var infowindow = new google.maps.InfoWindow();

  google.maps.event.addListener(autocomplete, 'place_changed', function() {
    infowindow.close();
    currentMarker.setVisible(false);
    input.className = '';
    var place = autocomplete.getPlace();
    if(!place.geometry) {
      //Benutzer informieren das der Platz nicht gefunden wurde
      input.className = 'notfound';
      return
    }

    //Wenn Daten über ein Platz vorhaden, kann man ihn anzeigen
    if(place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
    var image = {
      url: place.icon,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)
    };
    currentMarker.set("name", input.value);
    currentMarker.setIcon(image);
    currentMarker.setPosition(place.geometry.location);
    currentMarker.setVisible(true);
  });
};

function isProjectSelected() {
  return ((Session.get('current_project') != null) && (!Session.equals('current_project', null)));
};


// FileSaver: Hart reingebaut weil als externer File gekapselt und nicht aufrufbar.
var saveAs=saveAs||navigator.msSaveBlob&&navigator.msSaveBlob.bind(navigator)||function(e){"use strict";var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=e.URL||e.webkitURL||e,i=t.createElementNS("http://www.w3.org/1999/xhtml","a"),s="download"in i,o=function(n){var r=t.createEvent("MouseEvents");r.initMouseEvent("click",true,false,e,0,0,0,0,0,false,false,false,false,0,null);n.dispatchEvent(r)},u=e.webkitRequestFileSystem,a=e.requestFileSystem||u||e.mozRequestFileSystem,f=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},l="application/octet-stream",c=0,h=[],p=function(){var e=h.length;while(e--){var t=h[e];if(typeof t==="string"){r.revokeObjectURL(t)}else{t.remove()}}h.length=0},d=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var i=e["on"+t[r]];if(typeof i==="function"){try{i.call(e,n||e)}catch(s){f(s)}}}},v=function(t,r){var f=this,p=t.type,v=false,m,g,y=function(){var e=n().createObjectURL(t);h.push(e);return e},b=function(){d(f,"writestart progress write writeend".split(" "))},w=function(){if(v||!m){m=y(t)}if(g){g.location.href=m}else{window.open(m,"_blank")}f.readyState=f.DONE;b()},E=function(e){return function(){if(f.readyState!==f.DONE){return e.apply(this,arguments)}}},S={create:true,exclusive:false},x;f.readyState=f.INIT;if(!r){r="download"}if(s){m=y(t);i.href=m;i.download=r;o(i);f.readyState=f.DONE;b();return}if(e.chrome&&p&&p!==l){x=t.slice||t.webkitSlice;t=x.call(t,0,t.size,l);v=true}if(u&&r!=="download"){r+=".download"}if(p===l||u){g=e}if(!a){w();return}c+=t.size;a(e.TEMPORARY,c,E(function(e){e.root.getDirectory("saved",S,E(function(e){var n=function(){e.getFile(r,S,E(function(e){e.createWriter(E(function(n){n.onwriteend=function(t){g.location.href=e.toURL();h.push(e);f.readyState=f.DONE;d(f,"writeend",t)};n.onerror=function(){var e=n.error;if(e.code!==e.ABORT_ERR){w()}};"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=f["on"+e]});n.write(t);f.abort=function(){n.abort();f.readyState=f.DONE};f.readyState=f.WRITING}),w)}),w)};e.getFile(r,{create:false},E(function(e){e.remove();n()}),E(function(e){if(e.code===e.NOT_FOUND_ERR){n()}else{w()}}))}),w)}),w)},m=v.prototype,g=function(e,t){return new v(e,t)};m.abort=function(){var e=this;e.readyState=e.DONE;d(e,"abort")};m.readyState=m.INIT=0;m.WRITING=1;m.DONE=2;m.error=m.onwritestart=m.onprogress=m.onwrite=m.onabort=m.onerror=m.onwriteend=null;e.addEventListener("unload",p,false);return g}(self)
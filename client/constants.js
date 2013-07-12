/**
	Die "Fahr-Strategie" beeinflusst das Verhalten der Autos in der Simulation.

	 * GRASSHOPPER: Die Autos fahren von ihrem Heimat-Standort zum Ziel, von diesem Ziel dann zum nächsten Ziel usw. bis Sie keine km mehr haben.
	 * BEE: Die Autos fahren von ihrem Heimat-Standort zum Ziel und wieder zurück. Reicht die km für Hin und Zurück nicht, stoppt die Simulation für dieses Auto.
	 * DOG: Das Auto versucht einen Kreis zu fahren. Ähnlich wie GRASSHOPPER, nur am Ende soll es daheim ankommen.
**/
DrivingStrategy = {
  'GRASSHOPPER': 0,
  'BEE': 1,
  'DOG': 2
};
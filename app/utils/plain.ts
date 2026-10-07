// Tiefe Kopie als reines Objekt. structuredClone() wirft bei Vue-Reaktivität ("Proxy object could not be cloned"),
// weil reactive() ein Proxy ist; der Umweg über JSON funktioniert für Proxys und für reine Daten (Konfigurationen ohne Funktionen/Datum).
export const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x))

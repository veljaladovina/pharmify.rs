const sqlite3 = require('sqlite3').verbose();

// Povezivanje sa bazom podataka (kreira fajl ako ne postoji)
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Greška prilikom povezivanja sa bazom:', err.message);
  } else {
    console.log('Povezan sa SQLite bazom.');
  }
});

// Kreiranje tabele za korisničke upite (ako ne postoji)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      question TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;

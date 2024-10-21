require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Uključujemo SQLite
const OpenAI = require('openai'); // Uključujemo OpenAI
const mongoose = require('mongoose'); // Uključujemo mongoose za MongoDB
const bcrypt = require('bcryptjs'); // Uključujemo bcrypt za hashovanje lozinki
const User = require('./models/user'); // Uključujemo User model

const app = express();
const PORT = process.env.PORT || 3000; // Koristi port iz okruženja, inače 3000

// Middleware za parsiranje JSON tela zahteva
app.use(express.json());

// Osnovna ruta
app.get('/', (req, res) => {
    res.send('Dobrodošli na moju aplikaciju!'); // Ovo možeš promeniti po želji
});

// Konfiguracija OpenAI
const configuration = {
    apiKey: process.env.OPENAI_API_KEY, // Uveri se da imaš OPENAI_API_KEY u .env datoteci
};

const openai = new OpenAI(configuration); // Inicijalizuj OpenAI

// Povezivanje sa MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Povezan sa MongoDB Atlas!'))
.catch((err) => console.error('Greška prilikom povezivanja sa MongoDB:', err));

// =================== AUTENTIFIKACIJA ===================

// Ruta za registraciju korisnika
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Proveri da li korisnik već postoji
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Korisnik već postoji' });
        }

        // Hashuj lozinku
        const hashedPassword = await bcrypt.hash(password, 10);

        // Kreiraj novog korisnika
        const newUser = new User({
            username,
            password: hashedPassword,
        });

        // Sačuvaj korisnika u bazi
        await newUser.save();

        res.status(201).json({ message: 'Korisnik uspešno registrovan!' });
    } catch (error) {
        console.error('Greška prilikom registracije:', error);
        res.status(500).json({ message: 'Greška servera' });
    }
});

// Ruta za prijavu korisnika
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Proveri da li korisnik postoji
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Korisnik ne postoji' });
        }

        // Uporedi hashovanu lozinku sa unešenom lozinkom
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Neispravna lozinka' });
        }

        res.status(200).json({ message: 'Uspešno prijavljen!' });
    } catch (error) {
        console.error('Greška prilikom prijave:', error);
        res.status(500).json({ message: 'Greška servera' });
    }
});

// =================== POSTOJEĆE FUNKCIONALNOSTI ===================

// Ruta za skladištenje korisničkih upita u SQLite bazu podataka
app.post('/submit-query', (req, res) => {
    const { query } = req.body; // Uzmi korisnički upit iz tela zahteva

    // Otvori ili kreiraj SQLite bazu podataka
    let db = new sqlite3.Database('./queries.db', (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Povezan sa SQLite bazom podataka.');
    });

    // Kreiraj tabelu ako ne postoji
    db.run(`CREATE TABLE IF NOT EXISTS queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Skladišti upit u bazu podataka
    db.run(`INSERT INTO queries(query) VALUES(?)`, [query], function (err) {
        if (err) {
            return console.error(err.message);
        }
        res.status(201).json({ id: this.lastID, query });
    });

    // Zatvori bazu podataka
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Zatvorena SQLite baza podataka.');
    });
});

// Ruta za slanje upita AI-u
app.post('/ask-ai', async (req, res) => {
    const question = req.body.question; // Uzmi pitanje iz tela zahteva
    console.log('Primljen upit:', question);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // Model koji koristiš
            messages: [{ role: 'user', content: question }], // Upit
        });

        const answer = response.choices[0].message.content; // Odgovor od OpenAI
        console.log('Odgovor od OpenAI:', answer);
        res.json({ answer }); // Pošalji odgovor klijentu
    } catch (error) {
        console.error('Greška prilikom komunikacije sa OpenAI:', error);
        res.status(500).send('Došlo je do greške prilikom obrade vašeg zahteva.'); // Greška servera
    }
});

// Pokretanje servera
app.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});

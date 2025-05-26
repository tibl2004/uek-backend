CREATE TABLE arbeitszeiten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    arbeitszeit FLOAT NOT NULL, -- Arbeitszeit in Stunden
    user_id INT NOT NULL, -- user_id verweist auf die id von Admin oder Mitarbeiter
    kunden_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE, -- Verweist auf die Admin-Tabelle
    FOREIGN KEY (user_id) REFERENCES mitarbeiter(id) ON DELETE CASCADE, -- Verweist auf die Mitarbeiter-Tabelle
    FOREIGN KEY (kunden_id) REFERENCES kunden(id) ON DELETE CASCADE, -- Verweist auf die Kunden-Tabelle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vorname VARCHAR(255) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    plz VARCHAR(10) NOT NULL,
    ort VARCHAR(255) NOT NULL,
    mobil VARCHAR(15),
    sprache VARCHAR(50),
    geburtstagdatum DATE,
    email VARCHAR(255) UNIQUE NOT NULL,
    geschlecht ENUM('männlich', 'weiblich', 'divers'),
    adminnummer VARCHAR(9) UNIQUE NOT NULL,
    status ENUM('aktiv', 'inaktiv') DEFAULT 'aktiv',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE backend_paket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cpu VARCHAR(50) NOT NULL,
    ram VARCHAR(50) NOT NULL,
    preis DECIMAL(10, 2) NOT NULL,
    empfohlen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE bewerbungen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vorname VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    geburtstag DATE NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    plz VARCHAR(10) NOT NULL,
    ort VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    experience TEXT,
    skills TEXT,
    languages TEXT,
    interests TEXT,
    motivation TEXT,
    position VARCHAR(255),
    service_id INT, -- Annahme: service Tabelle existiert
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) -- Annahme: services Tabelle existiert
);
CREATE TABLE bewertungen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kundenId INT NOT NULL,
    arbeitsqualität VARCHAR(255) NOT NULL,
    arbeitsqualität_rating INT NOT NULL,
    tempo VARCHAR(255) NOT NULL,
    tempo_rating INT NOT NULL,
    gesamt VARCHAR(255) NOT NULL,
    gesamt_rating INT NOT NULL,
    team VARCHAR(255) NOT NULL,
    team_rating INT NOT NULL,
    freundlichkeit VARCHAR(255) NOT NULL,
    freundlichkeit_rating INT NOT NULL,
    zufriedenheit VARCHAR(255) NOT NULL,
    zufriedenheit_rating INT NOT NULL,
    preis VARCHAR(255) NOT NULL,
    preis_rating INT NOT NULL,
    gesamtrating DECIMAL(3,2) NOT NULL,
    gesamttext TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kundenId) REFERENCES kunden(id)
);

CREATE TABLE datenbank_pakete (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    maxDBSize INT NOT NULL,
    memory INT NOT NULL,
    preis DECIMAL(10, 2) NOT NULL,
    empfohlen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE dienstleistungen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    img VARCHAR(255) NOT NULL, -- Pfad oder URL zum Bild
    preis DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE faq (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE gutscheine (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guthaben DECIMAL(10, 2) NOT NULL,
    gueltigBis DATE NOT NULL,
    gutscheincode VARCHAR(255) NOT NULL UNIQUE,
    gutscheinbarcode VARCHAR(255) NOT NULL UNIQUE,
    gutscheinrabatt DECIMAL(10, 2) NOT NULL,
    gutscheinaktiviert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE home (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE kunden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kundennummer VARCHAR(50) UNIQUE NOT NULL,
    firma VARCHAR(255) NOT NULL,
    vorname VARCHAR(100) NOT NULL,
    nachname VARCHAR(100) NOT NULL,
    strasseHausnummer VARCHAR(255) NOT NULL,
    postleitzahl VARCHAR(10) NOT NULL,
    ort VARCHAR(100) NOT NULL,
    land VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobil VARCHAR(20) NOT NULL,
    geschlecht VARCHAR(10) NOT NULL,
    auftragsTyp VARCHAR(100) NOT NULL,
    auftragsBeschreibung TEXT NOT NULL,
    ip_adresse VARCHAR(45) NOT NULL,
    code VARCHAR(50) NOT NULL,
    auftragsnummer VARCHAR(50) NOT NULL,
    auftragsbestaetigungGesendet BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_persons INT NOT NULL,
    duration INT NOT NULL,  -- Dauer in Tagen oder Monaten
    monthly_price DECIMAL(10, 2) NOT NULL,
    yearly_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mitarbeiter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mitarbeiternummer VARCHAR(50) UNIQUE NOT NULL,
    geschlecht VARCHAR(10) NOT NULL,
    vorname VARCHAR(100) NOT NULL,
    nachname VARCHAR(100) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    postleitzahl VARCHAR(10) NOT NULL,
    ort VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobil VARCHAR(20) NOT NULL,
    benutzername VARCHAR(100) NOT NULL UNIQUE,
    passwort VARCHAR(255) NOT NULL,
    iban VARCHAR(34) NOT NULL,
    admin_id INT NOT NULL,  -- ID des Administrators, der den Mitarbeiter erstellt hat
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES mitarbeiter(id)  -- Verweis auf die Tabelle für Mitarbeiter (Admin)
);

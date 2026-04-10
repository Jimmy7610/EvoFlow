const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const filePath = path.join('..', '..', 'pdftest', 'Inlämningsuppgiften-Grupp V2.pdf');

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

(async () => {
    try {
        console.log("--- STARTING EXTRACTION (Standard v1.1.1) ---");
        const data = await pdf(dataBuffer);
        
        console.log("--- EXTRACTION SUCCESS ---");
        console.log("Filename:", path.basename(filePath));
        console.log("Character count:", data.text.length);
        console.log("First 200 chars:", data.text.substring(0, 200).replace(/\n/g, ' '));
        console.log("--- END ---");
    } catch (err) {
        console.error("--- EXTRACTION FAILED ---");
        console.error(err);
    }
})();

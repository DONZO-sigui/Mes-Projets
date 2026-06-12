const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    content = content.replace(/Enseignant/g, 'Directeur');
    content = content.replace(/enseignant/g, 'directeur');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.js') || filePath.endsWith('.ejs') || filePath.endsWith('.sql') || filePath.endsWith('.html'))) {
            callback(filePath);
        } else if (stat.isDirectory() && name !== 'node_modules' && name !== '.git' && name !== 'database') {
            walkSync(filePath, callback);
        }
    });
}

// Ensure we also check database/schema.sql and config/db.js explicitly
walkSync('c:\\Users\\LENOVO\\Desktop\\chatbot-absence', replaceInFile);

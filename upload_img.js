const fs = require('fs');
const path = require('path');

async function upload() {
    const filePath = 'C:\\Users\\noamb\\Downloads\\discord-server-boost-featured-image-2234087782.png';
    if (!fs.existsSync(filePath)) {
        console.error("Fichier introuvable:", filePath);
        process.exit(1);
    }

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('fileToUpload', blob, 'boost.png');

    try {
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });
        const url = await response.text();
        console.log("URL:", url);
    } catch (e) {
        console.error(e);
    }
}

upload();

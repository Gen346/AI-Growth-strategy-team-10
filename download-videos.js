import fs from 'fs';
import path from 'path';
import https from 'https';

const jsonFile = './ads-results.json';
const outputDir = './creatives';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

function downloadVideo(url, filename) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filename);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(filename, () => reject(err));
        });
    });
}

async function main() {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    let count = 0;
    for (const ad of data) {
        if (ad.snapshot && ad.snapshot.videos && ad.snapshot.videos.length > 0) {
            for (const video of ad.snapshot.videos) {
                const url = video.video_hd_url || video.video_sd_url;
                if (url) {
                    const filename = path.join(outputDir, `ad_${ad.ad_archive_id}_${count}.mp4`);
                    console.log(`Завантажую: ${url}`);
                    try {
                        await downloadVideo(url, filename);
                        console.log(`Збережено: ${filename}`);
                        count++;
                    } catch (e) {
                        console.error(`Помилка при завантаженні ${url}:`, e.message);
                    }
                }
            }
        }
    }
    if (count === 0) {
        console.log('Відео не знайдено у JSON.');
    }
}

main();

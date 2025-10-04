import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!APIFY_TOKEN) {
    console.error('Помилка: APIFY_TOKEN не знайдено. Будь ласка, встановіть його як змінну середовища.');
    process.exit(1);
}

const client = new ApifyClient({ token: APIFY_TOKEN });

async function scrapeFacebookAds(providedUrl) {
    console.log('Підключення до Apify...');
    let adLibraryUrl = providedUrl;
    if (!adLibraryUrl) {
        const rl = readline.createInterface({ input, output });
        adLibraryUrl = await rl.question(
            'Введіть URL з рекламної бібліотеки Facebook (наприклад, https://www.facebook.com/ads/library/?...): \n> '
        );
        rl.close();
    }

    console.log(`Запускаю скрапінг для URL: ${adLibraryUrl}`);

    const inputObj = {
        urls: [
            { url: adLibraryUrl }
        ],
        count: 10,
        period: "",
        "scrapePageAds.activeStatus": "all",
        "scrapePageAds.countryCode": "ALL"
    };

    try {
        console.log('Викликаю client.actor().call...');
        const run = await client.actor('curious_coder/facebook-ads-library-scraper').call(inputObj);
        console.log(`\nЗапуск завершено! Run ID: ${run.id}`);

        console.log('Отримую результати з dataset...');
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log('Результати отримано.');

        if (items.length === 0) {
            console.log('Жодної реклами не знайдено. Перевірте правильність URL.');
            return;
        }

        console.log(JSON.stringify(items, null, 2));

        const fs = await import('fs');
        const outPath = 'public/ads-results.json';
        fs.mkdirSync('public', { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf-8');
        console.log(`Результати також збережено у файл ${outPath}`);
    } catch (error) {
        console.error('Сталася помилка під час запуску Apify Actor:', error.message);
    }
}

const argUrl = process.argv[2];
scrapeFacebookAds(argUrl);
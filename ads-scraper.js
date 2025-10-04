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
const rl = readline.createInterface({ input, output });

async function scrapeFacebookAds() {
    console.log('Підключення до Apify...');
    // 1. Отримання URL від користувача
    const adLibraryUrl = await rl.question(
        'Введіть URL з рекламної бібліотеки Facebook (наприклад, https://www.facebook.com/ads/library/?...): \n> '
    );
    rl.close();

    console.log(`Запускаю скрапінг для URL: ${adLibraryUrl}`);

    // 2. Вхідні дані для Apify Actor (оновлений формат згідно документації)
    const input = {
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
        // 3. Запуск актора (Scraper)
        const run = await client.actor('curious_coder/facebook-ads-library-scraper').call(input);
        console.log(`\nЗапуск завершено! Run ID: ${run.id}`);

        console.log('Отримую результати з dataset...');
        // 4. Отримання результатів
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log('Результати отримано.');


        if (items.length === 0) {
            console.log('Жодної реклами не знайдено. Перевірте правильність URL.');
            return;
        }

    // Вивести весь JSON у термінал
    console.log(JSON.stringify(items, null, 2));

    // Зберегти результати у файл
    const fs = await import('fs');
    fs.writeFileSync('ads-results.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Результати також збережено у файл ads-results.json');

    } catch (error) {
        console.error('Сталася помилка під час запуску Apify Actor:', error.message);
    }
}

scrapeFacebookAds();



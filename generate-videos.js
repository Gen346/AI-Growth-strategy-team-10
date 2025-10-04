import 'dotenv/config';
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import readline from 'readline';
import * as fs from 'fs';
import * as readline from 'node:readline/promises';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ Помилка: Змінна середовища GEMINI_API_KEY не встановлена.");
    console.error("Будь ласка, встановіть її перед запуском.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function generateVideo(prompt, durationSeconds = 8, aspectRatio = '16:9') {
    console.log(`🎬 Генеруємо відео з запитом: "${prompt}"`);
    console.log(`⏱️ Тривалість: ${durationSeconds} секунд`);
    console.log(`📐 Співвідношення сторін: ${aspectRatio}`);
    
    try {
        if (!fs.existsSync('videos')) {
            fs.mkdirSync('videos');
        }

        console.log("🚀 Відправляю запит на генерацію відео...");
        
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                aspectRatio: aspectRatio,
                durationSeconds: durationSeconds,
                personGeneration: PersonGeneration.ALLOW_ALL,
            },
        });

        console.log("⏳ Генерація відео розпочато. Очікування завершення...");
        console.log("💡 Це може зайняти кілька хвилин...");

        let attempts = 0;
        const maxAttempts = 60;
        
        while (!operation.done && attempts < maxAttempts) {
            attempts++;
            console.log(`⏳ Статус: В обробці... (спроба ${attempts}/${maxAttempts})`);
            console.log("⏰ Очікування 10 секунд...");
            
            await new Promise((resolve) => setTimeout(resolve, 10000));
            
            try {
                operation = await ai.operations.getVideosOperation({
                    operation: operation,
                });
            } catch (statusError) {
                console.log("⚠️ Помилка при перевірці статусу, продовжуємо очікування...");
            }
        }

        if (attempts >= maxAttempts) {
            console.error("❌ Час очікування вичерпано. Спробуйте пізніше.");
            return;
        }

        console.log("✅ Генерація відео завершена!");
        console.log(`🎉 Згенеровано ${operation.response?.generatedVideos?.length ?? 0} відео(а).`);

        if (operation.response?.generatedVideos) {
            for (let i = 0; i < operation.response.generatedVideos.length; i++) {
                const generatedVideo = operation.response.generatedVideos[i];
                
                if (generatedVideo?.video?.uri) {
                    console.log(`📥 Завантажую відео ${i + 1}: ${generatedVideo.video.uri}`);
                    
                    try {
                        const response = await fetch(`${generatedVideo.video.uri}&key=${apiKey}`);
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const buffer = await response.arrayBuffer();
                        
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const safePrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
                        const filename = `videos/veo2-video-${timestamp}-${safePrompt}-${i}.mp4`;
                        
                        await writeFile(filename, Buffer.from(buffer));
                        
                        const stats = fs.statSync(filename);
                        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                        
                        console.log(`🎉 Відео ${i + 1} збережено як: ${filename}`);
                        console.log(`📊 Розмір файлу: ${fileSizeInMB} MB`);
                        
                    } catch (downloadError) {
                        console.error(`❌ Помилка при завантаженні відео ${i + 1}:`, downloadError.message);
                    }
                } else {
                    console.log(`⚠️ Відео ${i + 1} не містить URI для завантаження`);
                }
            }
        } else {
            console.error("❌ Не вдалося отримати згенеровані відео.");
        }

    } catch (error) {
        console.error("❌ Помилка при генерації відео:", error.message);
        
        if (error.message.includes("quota") || error.message.includes("429")) {
            console.log("💡 Підказка: Вичерпана квота. Зачекайте 24 години або оновіть план.");
        } else if (error.message.includes("model") || error.message.includes("not found")) {
            console.log("💡 Підказка: Модель veo-2.0-generate-001 може бути недоступна в вашому регіоні.");
        } else if (error.message.includes("No instances") || error.message.includes("INVALID_ARGUMENT")) {
            console.log("💡 Підказка: Проблема з форматом запиту або модель недоступна.");
        }
        
        await createFallbackDescription(prompt, durationSeconds);
    }
}

async function createFallbackDescription(prompt, durationSeconds) {
    try {
        console.log("\n🔄 Створюю детальний опис відео (запасний варіант)...");
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                text: `Створи дуже детальний опис відео тривалістю ${durationSeconds} секунд: "${prompt}".

Опиши:
- Сцени та кадри (по секундах)
- Рухи та дії персонажів
- Кольори та освітлення
- Атмосферу та настрої
- Переходи між сценами
- Звукові ефекти (якщо потрібно)
- Стиль та візуальні ефекти

Це має бути настільки детальний опис, щоб режисер міг зняти це відео точно за твоїм описом.`
            }]
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `videos/video-description-${timestamp}.txt`;
        
        const content = `ЗАПИТ: ${prompt}
ТРИВАЛІСТЬ: ${durationSeconds} секунд
СТВОРЕНО: ${new Date().toLocaleString()}

ДЕТАЛЬНИЙ ОПИС ВІДЕО:
${response.text}`;
        
        fs.writeFileSync(filename, content);
        console.log(`📝 Детальний опис відео збережено як: ${filename}`);
        console.log("📖 Опис (фрагмент):", response.text.substring(0, 300) + "...");
        
    } catch (descError) {
        console.error("❌ Помилка при створенні опису:", descError.message);
    }
}

async function selectDuration() {
    return new Promise((resolve) => {
        console.log("\n⏱️ Виберіть тривалість відео (Veo 2.0 підтримує 4, 6, 8 сек):");
        console.log("1. 4 секунди");
        console.log("2. 6 секунд");
        console.log("3. 8 секунд (за замовчуванням)");
        
        rl.question("Введіть номер (1-3) або натисніть Enter для 8 секунд: ", (input) => {
            const choice = input.trim();
            let duration = 8;
            
            switch (choice) {
                case '1':
                    duration = 4;
                    console.log("✅ Обрано: 4 секунди");
                    break;
                case '2':
                    duration = 6;
                    console.log("✅ Обрано: 6 секунд");
                    break;
                case '3':
                case '':
                    duration = 8;
                    if (choice === '') {
                        console.log("✅ Обрано: 8 секунд (за замовчуванням)");
                    } else {
                        console.log("✅ Обрано: 8 секунд");
                    }
                    break;
                default:
                    console.log(`⚠️ Невірний вибір '${choice}'. Використовую 8 секунд (за замовчуванням).`);
                    duration = 8;
            }
            
            resolve(duration);
        });
    });
}

async function selectAspectRatio() {
    return new Promise((resolve) => {
        console.log("\n📐 Виберіть співвідношення сторін:");
        console.log("1. 16:9 (широкоекранний)");
        console.log("2. 9:16 (вертикальний)");
        console.log("3. 1:1 (квадратний)");
        
        rl.question("Введіть номер (1-3) або натисніть Enter для 16:9: ", (input) => {
            const choice = input.trim();
            let aspectRatio = '16:9';
            
            switch (choice) {
                case '1':
                case '':
                    aspectRatio = '16:9';
                    console.log("✅ Обрано: 16:9 (широкоекранний)");
                    break;
                case '2':
                    aspectRatio = '9:16';
                    console.log("✅ Обрано: 9:16 (вертикальний)");
                    break;
                case '3':
                    aspectRatio = '1:1';
                    console.log("✅ Обрано: 1:1 (квадратний)");
                    break;
                default:
                    console.log(`⚠️ Невірний вибір '${choice}'. Використовую 16:9 (за замовчуванням).`);
                    aspectRatio = '16:9';
            }
            
            resolve(aspectRatio);
        });
    });
}

async function main() {
    console.log("🎬 AI Генератор відео (Veo 2.0) запущено!");
    console.log("💡 Введіть опис відео, яке хочете створити (або 'exit' для виходу).");
    console.log("⚠️ Генерація Veo 2.0 є платною і може вимагати підписки Google AI Pro.");

    const askForVideo = async () => {
        rl.question("\n👤 Ваш запит: ", async (input) => {
            if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'вихід') {
                console.log("👋 До побачення!");
                rl.close();
                return;
            }

            if (input.trim() === '') {
                console.log("⚠️ Будь ласка, введіть опис відео!");
                askForVideo();
                return;
            }

            const duration = await selectDuration();
            const aspectRatio = await selectAspectRatio();
            
            await generateVideo(input, duration, aspectRatio);
            
            console.log("\n" + "=".repeat(60) + "\n");
            askForVideo();
        });
    };

    askForVideo();
}

main();
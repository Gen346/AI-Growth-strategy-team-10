import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";
import readline from 'readline';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY не знайдено в змінних середовища");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateImage(prompt) {
  try {
    console.log("🎨 Генерую зображення...");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log("📝 Опис:", part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `images/generated-image-${timestamp}.png`;
        
        fs.writeFileSync(filename, buffer);
        console.log(`✅ Зображення збережено як: ${filename}`);
      }
    }
  } catch (error) {
    console.error("❌ Помилка при генерації зображення:", error.message);
    
    if (error.message.includes("quota") || error.message.includes("429") || 
        error.message.includes("image") || error.message.includes("modality")) {
      
      console.log("🔄 Квота вичерпана або модель не підтримує зображення.");
      console.log("📝 Створюю детальний опис замість зображення...");
      
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Створи дуже детальний опис зображення: ${prompt}. 
          Опиши кольори, композицію, стиль, атмосферу, деталі. 
          Це має бути настільки детальний опис, щоб художник міг намалювати це зображення.`,
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `images/image-description-${timestamp}.txt`;
        
        fs.writeFileSync(filename, `Запит: ${prompt}\n\nДетальний опис:\n${response.text}`);
        console.log(`📝 Детальний опис збережено як: ${filename}`);
        console.log("📖 Опис:", response.text);
        
      } catch (descError) {
        console.error("❌ Помилка при створенні опису:", descError.message);
      }
    }
  }
}

async function main() {
  console.log("🎨 AI Генератор зображень запущено!");
  console.log("💡 Введіть опис зображення, яке хочете створити (або 'exit' для виходу):\n");

  const askForImage = () => {
    rl.question("👤 Ваш запит: ", async (input) => {
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'вихід') {
        console.log("👋 До побачення!");
        rl.close();
        return;
      }

      if (input.trim() === '') {
        console.log("⚠️ Будь ласка, введіть опис зображення!");
        askForImage();
        return;
      }

      await generateImage(input);
      console.log("\n" + "=".repeat(50) + "\n");
      askForImage();
    });
  };

  askForImage();
}

await main();

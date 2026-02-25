import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  const downloadPath = path.resolve("./downloads");
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath
  });

  await page.goto("https://www.tradingref.com/", {
    waitUntil: "networkidle2"
  });

  console.log("Page loaded");

  await page.waitForTimeout(3000);

  // Helper to click by partial text
  async function clickByText(text) {
    await page.evaluate((text) => {
      const elements = [...document.querySelectorAll("*")];
      const target = elements.find(el =>
        el.innerText &&
        el.innerText.toLowerCase().includes(text.toLowerCase())
      );
      if (target) target.click();
    }, text);
  }

  // 1️⃣ Select Language
  await clickByText("Language");
  await page.waitForTimeout(1000);
  await clickByText("english");
  await page.waitForTimeout(1000);

  // 2️⃣ Select Newspaper
  await clickByText("Newspaper");
  await page.waitForTimeout(1000);
  await clickByText("Mint");
  await page.waitForTimeout(1000);

  // 3️⃣ Select Edition
  await clickByText("Edition");
  await page.waitForTimeout(1000);
  await clickByText("Bengaluru");
  await page.waitForTimeout(1000);

  // 4️⃣ Date (Usually auto-selected as today)
  // If date picker required, we’ll enhance later

  // 5️⃣ Click Generate
  await clickByText("Generate");
  console.log("Clicked Generate");

  // Wait for loader + download
  await page.waitForTimeout(25000);

  const files = fs.readdirSync(downloadPath);

  if (files.length === 0) {
    console.log("No file downloaded.");
    await browser.close();
    return;
  }

  const filePath = path.join(downloadPath, files[0]);

  console.log("Downloaded:", filePath);

  // Send to Telegram
  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", fs.createReadStream(filePath));

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
    method: "POST",
    body: form
  });

  console.log("Sent to Telegram");

  await browser.close();
})();

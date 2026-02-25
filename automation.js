import puppeteer from "puppeteer";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://www.tradingref.com/", {
    waitUntil: "networkidle2"
  });

  console.log("Page loaded");

  // Helper function to click element by visible text
  async function clickByText(text) {
    await page.evaluate((text) => {
      const elements = [...document.querySelectorAll("*")];
      const target = elements.find(el =>
        el.innerText && el.innerText.trim() === text
      );
      if (target) target.click();
    }, text);
  }

  // Wait a bit for UI to fully render
  await page.waitForTimeout(3000);

  // Select Language
  await clickByText("english");
  await page.waitForTimeout(1000);

  // Select Newspaper
  await clickByText("Mint");
  await page.waitForTimeout(1000);

  // Select Edition
  await clickByText("Bengaluru");
  await page.waitForTimeout(1000);

  // Click Generate
  await clickByText("Generate");
  console.log("Clicked Generate");

  // Wait for PDF to load
  await page.waitForTimeout(6000);

  const pdfUrl = page.url();
  console.log("PDF URL:", pdfUrl);

  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();

  fs.writeFileSync("mint.pdf", Buffer.from(buffer));

  // Send to Telegram
  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", fs.createReadStream("mint.pdf"));

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
    method: "POST",
    body: form
  });

  console.log("Sent to Telegram");

  await browser.close();
})();

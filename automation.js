import puppeteer from "puppeteer";
import fs from "fs";
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

  await page.goto("https://www.tradingref.com/", {
    waitUntil: "networkidle2"
  });

  console.log("Page loaded");

  await page.waitForTimeout(3000);

  // Select language, newspaper, edition if needed
  await page.evaluate(() => {
    const clickByText = (text) => {
      const el = [...document.querySelectorAll("*")]
        .find(e => e.innerText && e.innerText.includes(text));
      if (el) el.click();
    };

    clickByText("english");
    clickByText("Mint");
    clickByText("Bengaluru");
  });

  await page.waitForTimeout(2000);

  // Listen for PDF response
  const pdfPromise = new Promise(resolve => {
    page.on("response", async response => {
      const headers = response.headers();
      const contentType = headers["content-type"] || "";

      if (contentType.includes("application/pdf")) {
        console.log("PDF response detected");
        const buffer = await response.buffer();
        resolve(buffer);
      }
    });
  });

  // Click Generate
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(el => el.innerText.includes("Generate"));
    if (btn) btn.click();
  });

  console.log("Clicked Generate");

  const pdfBuffer = await pdfPromise;

  if (!pdfBuffer) {
    console.log("PDF not captured.");
    await browser.close();
    return;
  }

  fs.writeFileSync("mint.pdf", pdfBuffer);
  console.log("PDF saved");

  // 🚨 Make sure secrets exist
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.log("Telegram secrets missing.");
    await browser.close();
    return;
  }

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

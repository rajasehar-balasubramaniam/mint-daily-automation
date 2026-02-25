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

  // Wait for form
  await page.waitForSelector("body");

  // ---- Select Language ----
  await page.click("div:has-text('english')");
  await page.waitForTimeout(1000);

  // ---- Select Newspaper ----
  await page.click("div:has-text('Mint')");
  await page.waitForTimeout(1000);

  // ---- Select Edition ----
  await page.click("div:has-text('Bengaluru')");
  await page.waitForTimeout(1000);

  // ---- Click Generate ----
  await page.click("button:has-text('Generate')");
  console.log("Clicked Generate");

  // Wait for new tab or PDF
  const newPagePromise = new Promise(resolve =>
    browser.once("targetcreated", target =>
      resolve(target.page())
    )
  );

  const pdfPage = await newPagePromise;
  await pdfPage.waitForTimeout(5000);

  const pdfUrl = pdfPage.url();
  console.log("PDF URL:", pdfUrl);

  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();

  fs.writeFileSync("mint.pdf", Buffer.from(buffer));

  // ---- Send to Telegram ----
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

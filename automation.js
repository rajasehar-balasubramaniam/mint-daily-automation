import puppeteer from "puppeteer";
import fs from "fs";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";
import FormData from "form-data";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  const imageUrls = [];

  // Capture S3 image requests
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("ht-mint-epaper-fs.s3")) {
      imageUrls.push(url);
    }
  });

  await page.goto("https://www.tradingref.com/", {
    waitUntil: "networkidle2"
  });

  console.log("Page loaded");

  await page.waitForTimeout(3000);

  // Select defaults if needed
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

  // Click Generate
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(el => el.innerText.includes("Generate"));
    if (btn) btn.click();
  });

  console.log("Clicked Generate");

  // Wait for all images to load
  await page.waitForTimeout(25000);

  await browser.close();

  if (imageUrls.length === 0) {
    console.log("No images captured.");
    return;
  }

  console.log("Captured images:", imageUrls.length);

  // Remove duplicates
  const uniqueImages = [...new Set(imageUrls)];

  const pdfDoc = await PDFDocument.create();

  for (const url of uniqueImages) {
    const res = await fetch(url);
    const imgBytes = await res.arrayBuffer();
    const image = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("mint.pdf", pdfBytes);

  console.log("PDF created");

  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.log("Telegram secrets missing.");
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
})();

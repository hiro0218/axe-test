import fs from "fs";
import { AxePuppeteer } from "@axe-core/puppeteer";
import AxeReports from "axe-reports";
import puppeteer from "puppeteer";
import AXE_LOCALE_JA from "axe-core/locales/ja.json";

const config = {
  locale: AXE_LOCALE_JA,
};

const readUrls = () => {
  const urlsFile = fs.readFileSync("./urls.txt", "utf-8");
  const urls_list = urlsFile.replace(/\r\n?/g, '\n');
  const urls = urls_list.split('\n');

  return urls;
}

(async () => {
  // テスト対象の URL を読み込み
  const urls = readUrls();

  // 見出し行
  AxeReports.createCsvReportHeaderRow();

  const browser = await puppeteer.launch();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const page = await browser.newPage();
    await page.setBypassCSP(true);

    // デバイスのエミュレートをする
    // await page.emulate(puppeteer.devices['iPhone 8']);

    // ページ読み込み
    await Promise.all([
      page.setDefaultNavigationTimeout(0),
      page.waitForNavigation({ waitUntil: ["load", "networkidle2"] }),
      page.goto(`${url}`),
    ]);

    // テスト実行
    const results = await new AxePuppeteer(page)
      // @ts-ignore
      .configure(config)
      .withTags(["wcag2a", "wcag21a"])
      .analyze();

    // 検証結果の行を追加
    AxeReports.createCsvReportRow(results);

    await page.close();
  }

  await browser.close();
})();

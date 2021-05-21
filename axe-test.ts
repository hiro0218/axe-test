import fs from "fs";
import { AxePuppeteer } from "@axe-core/puppeteer";
import AxeReports from "axe-reports";
import puppeteer from "puppeteer";

// テスト結果を日本語で出力するように設定する。
import AXE_LOCALE_JA from "axe-core/locales/ja.json";
const config = {
  locale: AXE_LOCALE_JA,
};

// テスト対象の URL を、外部テキストファイルから読み込んで、配列に整形する。
const urlsFile = fs.readFileSync("./urls.txt", "utf-8");
const urls_list = urlsFile.replace(/\r?\n/g, ",");

(async () => {
  const urls = urls_list.split(",");

  // axe-reports で、見出し行をまずは作成する。
  AxeReports.createCsvReportHeaderRow();

  const browser = await puppeteer.launch();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const page = await browser.newPage();
    await page.setBypassCSP(true);

    // デバイスのエミュレートをする場合は、下記を適用する。
    // await page.emulate(puppeteer.devices['iPhone 8']);

    // ページを読み込む。
    await Promise.all([
      page.setDefaultNavigationTimeout(0),
      page.waitForNavigation({ waitUntil: ["load", "networkidle2"] }),
      page.goto(`${url}`),
    ]);

    // テストを実行する。withTags で、テスト基準をいろいろ設定できる。
    const results = await new AxePuppeteer(page)
      // @ts-ignore
      .configure(config)
      .withTags(["wcag2a", "wcag21a"])
      .analyze();

    // axe-reports で、検証結果の行を追加する。
    AxeReports.createCsvReportRow(results);

    await page.close();
  }

  await browser.close();
})();

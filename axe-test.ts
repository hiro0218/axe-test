import fs from "fs-extra";
import { AxePuppeteer } from "@axe-core/puppeteer";
import AxeReports from "axe-reports";
import puppeteer from "puppeteer";
import AXE_LOCALE_JA from "axe-core/locales/ja.json";
import consola from "consola";

const FILE_NAME = "result";
const FILE_EXTENSION = "csv";
const CSV_HEADER = "URL,Volation Type,Impact,Help,HTML Element,Messages,DOM Element\r";
const config = {
  locale: AXE_LOCALE_JA,
};

const readUrls = () => {
  const urlsFile = fs.readFileSync("./urls.txt", "utf-8");
  const urls_list = urlsFile.replace(/\r\n?/g, "\n");
  const urls = urls_list.split("\n").filter((url) => !!url);

  return urls;
};

(async () => {
  // テスト対象の URL を読み込み
  const urls = readUrls();

  // 残っていたファイルがあれば削除
  fs.removeSync(`./${FILE_NAME}.${FILE_EXTENSION}`);

  // 見出し行
  fs.writeFileSync(`./${FILE_NAME}.${FILE_EXTENSION}`, CSV_HEADER);

  const browser = await puppeteer.launch();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    consola.info(`a11y test: ${url}`);

    const page = await browser.newPage();
    await page.setBypassCSP(true);

    // デバイスのエミュレートをする
    if (url.includes('/sp')) {
      await page.emulate(puppeteer.devices['iPhone X']);
    }

    // ページ最下部まで進む
    let previousHeight;
    while (true) {
      try {
        previousHeight = await page.evaluate('document.body.scrollHeight')
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`)
      } catch (e) {
        // consola.log('Scroll End Page')
        break;
      }
    }

    // ページ読み込み
    await Promise.all([
      page.setDefaultNavigationTimeout(0),
      page.waitForNavigation({ waitUntil: ["load", "networkidle0"] }),
      page.goto(url).catch(() => {
        consola.error(`Connection failed: ${url}`);
      }),
    ]);

    // テスト実行
    const results = await new AxePuppeteer(page)
      // @ts-ignore
      .configure(config)
      .withTags(["wcag2a", "wcag21a"])
      .analyze();

    // 検証結果の行を追加
    AxeReports.processResults(results, `${FILE_EXTENSION}`, `./${FILE_NAME}`);

    await page.close();
  }

  await browser.close();
})();

import fs from "node:fs";
import { AxePuppeteer } from "@axe-core/puppeteer";
import type { Spec, AxeResults, ImpactValue } from "axe-core";
import AxeReports from "axe-reports";
import puppeteer, { Browser, Page } from "puppeteer";
import AXE_LOCALE_JA from "axe-core/locales/ja.json";

type AxeResultsKeys = keyof Omit<
  AxeResults,
  | "toolOptions"
  | "testEngine"
  | "testRunner"
  | "testEnvironment"
  | "url"
  | "timestamp"
>;

const FILE_NAME = "result";
const FILE_EXTENSION = "csv";
const CSV_FILE_PATH = `./${FILE_NAME}.${FILE_EXTENSION}`;
const CSV_HEADER = "URL,種別,影響度,ヘルプ,HTML要素,メッセージ,DOM要素\r";
const CSV_TRANSLATE_RESULT_GROUPS: AxeResultsKeys[] = [
  "inapplicable",
  "violations",
  "incomplete",
  "passes",
];
const CSV_TRANSLATE_IMPACT_VALUE = {
  critical: "緊急 (Critical)",
  serious: "深刻 (Serious)",
  moderate: "普通 (Moderate)",
  minor: "軽微 (Minor)",
};

/**
 * URLをファイルから非同期で読み込む
 * @returns {Promise<string[]>} URLの配列
 */
const readUrls = async (): Promise<string[]> => {
  // ファイルを非同期で読み込む
  const urlsFile = await fs.promises.readFile("./urls.txt", "utf-8");
  // 改行で分割し、空の行を除外
  const urls = urlsFile
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((url) => url);

  return urls;
};

/**
 * ページの最下部までスクロールする
 * @param {Page} page - PuppeteerのPageオブジェクト
 */
const scrollToBottom = async (page: Page) => {
  let previousHeight;

  while (true) {
    // 現在のページの高さを取得
    previousHeight = await page.evaluate("document.body.scrollHeight");
    // ページの最下部までスクロール
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");

    try {
      // ページの高さが変わるまで待つ
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`,
        { timeout: 10000 }
      );
    } catch {
      // タイムアウト時にループを抜ける
      break;
    }
  }
};

/**
 * Axeの結果の影響度の値を日本語に置き換える
 * @param {AxeResults} data - Axeの結果
 * @returns {AxeResults}
 */
const replaceImpactValues = (data: AxeResults): AxeResults => {
  for (let i = 0; i < CSV_TRANSLATE_RESULT_GROUPS.length; i++) {
    const key = CSV_TRANSLATE_RESULT_GROUPS[i];

    for (let j = 0; j < data[key].length; j++) {
      const node = data[key][j];

      if (node.impact !== null && node.impact !== undefined) {
        node.impact = CSV_TRANSLATE_IMPACT_VALUE[node.impact] as ImpactValue;
      }
    }
  }

  return data;
};

/**
 * Axeによるアクセシビリティテストを実行する
 * @param {Page} page - PuppeteerのPageオブジェクト
 * @param {string} url - テストするURL
 * @returns {Promise<AxeResults>} - テスト結果
 */
const runAxeTest = async (
  page: Page,
  url: string
): Promise<AxeResults> => {
  console.log(`Testing ${url}...`);

  // 指定されたURLにアクセス
  await page.goto(url, { waitUntil: ["load", "networkidle2"] }).catch(() => {
    console.error(`Connection failed: ${url}`);
  });

  console.log(`page title: ${await page.title()}`);

  // ページの最下部までスクロール
  await scrollToBottom(page);

  // AxePuppeteerを使用してアクセシビリティテストを実行
  const results = await new AxePuppeteer(page)
    .configure({ locale: AXE_LOCALE_JA } as unknown as Spec)
    .withTags(["wcag2a", "wcag21a"])
    .analyze()
    .then(analyzeResults => replaceImpactValues(analyzeResults))

  return results;
};

/**
 * URLごとにページを設定し、アクセシビリティテストを実行する
 * @param {string} url - テストするURL
 * @param {Browser} browser - PuppeteerのBrowserオブジェクト
 */
async function setupAndRunAxeTest(url: string, browser: Browser) {
  const page = await browser.newPage();
  await page.setBypassCSP(true);

  try {
    // アクセシビリティテストを実行し、結果をログに出力
    const results = await runAxeTest(page, url);
    // 結果をCSV形式で保存
    AxeReports.processResults(results, FILE_EXTENSION, FILE_NAME);
  } catch (error) {
    // エラー発生時の処理
    console.error(`Error testing ${url}:`, error);
  } finally {
    // ページを閉じる
    await page.close();
  }
}

(async () => {
  // URLをファイルから読み込む
  const urls = await readUrls();

  // 既存のCSVファイルがあれば削除
  if (fs.existsSync(CSV_FILE_PATH)) {
    fs.rmSync(CSV_FILE_PATH);
  }

  // 新しいCSVファイルを作成
  fs.writeFileSync(CSV_FILE_PATH, CSV_HEADER);

  // ヘッドレスブラウザを起動
  const browser = await puppeteer.launch({ headless: "new" });

  // 全てのURLに対してテストを直列実行
  for (const url of urls) {
    await setupAndRunAxeTest(url, browser);
  }

  // ブラウザを閉じる
  await browser.close();
})();

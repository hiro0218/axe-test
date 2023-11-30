import "dotenv/config";

import fs from "node:fs";
import { AxePuppeteer } from "@axe-core/puppeteer";
import type { Spec, AxeResults, ImpactValue } from "axe-core";
import AxeReports from "axe-reports";
import puppeteer, { Browser, Page } from "puppeteer";
import AXE_LOCALE_JA from "axe-core/locales/ja.json";
import {
	FILE_NAME,
	FILE_EXTENSION,
	CSV_FILE_PATH,
	CSV_HEADER,
	CSV_TRANSLATE_RESULT_GROUPS,
	CSV_TRANSLATE_IMPACT_VALUE,
} from "./constant";

/**
 * URLをファイルから非同期で読み込む
 */
const readUrls = async (): Promise<string[]> => {
	const urlsFile = await fs.promises.readFile("./urls.txt", "utf-8");

	const urls = urlsFile
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.filter((url) => url);

	return urls;
};

/**
 * 指定した時間だけ待機する関数
 * @param ms 待機時間（ミリ秒）
 */
const waitForTimeout = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * ページの最下部までスクロールする
 */
const scrollToBottom = async (
	page: Page,
	maxScrolls = 10,
	waitTime = 3000,
): Promise<void> => {
	let previousHeight = 0;
	let scrollCount = 0;

	while (scrollCount < maxScrolls) {
		const currentHeight: number = await page.evaluate(
			() => document.body.scrollHeight,
		);

		if (previousHeight === currentHeight) break;

		await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
		previousHeight = currentHeight;

		await waitForTimeout(waitTime);

		scrollCount++;
	}
};

/**
 * Axeの結果の影響度の値を日本語に置き換える
 */
const replaceImpactValues = (axeResult: AxeResults): AxeResults => {
	const result = { ...axeResult };

	for (const key of CSV_TRANSLATE_RESULT_GROUPS) {
		if (result[key] && Array.isArray(result[key])) {
			const updatedItems = [];
			for (const item of result[key]) {
				if (item.impact && CSV_TRANSLATE_IMPACT_VALUE[item.impact]) {
					updatedItems.push({
						...item,
						impact: CSV_TRANSLATE_IMPACT_VALUE[item.impact] as ImpactValue,
					});
				} else {
					updatedItems.push(item);
				}
			}
			result[key] = updatedItems;
		}
	}

	return result;
};

/**
 * Axeによるアクセシビリティテストを実行する
 */
const runAxeTest = async (page: Page, url: string): Promise<AxeResults> => {
	console.log(`Testing ${url}...`);

	// 指定されたURLにアクセス
	await page.goto(url, { waitUntil: ["load", "networkidle2"] }).catch(() => {
		console.error(`Connection failed: ${url}`);
	});

	console.log(`page title: ${await page.title()}`);

	await scrollToBottom(page);

	const results = await new AxePuppeteer(page)
		.configure({ locale: AXE_LOCALE_JA } as unknown as Spec)
		.withTags(["wcag2a", "wcag21a", "best-practice"])
		.analyze()
		.then((analyzeResults) => replaceImpactValues(analyzeResults));

	return results;
};

/**
 * URLごとにページを設定し、アクセシビリティテストを実行する
 */
async function setupAndRunAxeTest(url: string, browser: Browser) {
	const page = await browser.newPage();
	await page.setBypassCSP(true);

	/**
	 * process.env.DEVICE_TYPE
	 * @type {"0" | "1" | undefined}
	 * @description "0" はデスクトップ / "1" はモバイル
	 */
	if (process.env.DEVICE_TYPE === "1") {
		const userAgent = await browser.userAgent();
		await page.emulate({
			userAgent,
			viewport: {
				width: 375,
				height: 812,
				isMobile: true,
				hasTouch: true,
			},
		});
	}

	try {
		const results = await runAxeTest(page, url);
		AxeReports.processResults(results, FILE_EXTENSION, FILE_NAME);
	} catch (error) {
		console.error(`Error testing ${url}:`, error);
	} finally {
		await page.close();
	}
}

(async () => {
	const urls = await readUrls();

	if (fs.existsSync(CSV_FILE_PATH)) {
		fs.rmSync(CSV_FILE_PATH);
	}
	fs.writeFileSync(CSV_FILE_PATH, CSV_HEADER);

	const browser = await puppeteer.launch({ headless: "new" });

	try {
		await Promise.all(urls.map((url) => setupAndRunAxeTest(url, browser)));
	} catch (error) {
		console.error(`Error during tests: ${error}`);
	} finally {
		await browser.close();
	}
})();

import type { AxeResultsKeys } from "./types";

export const FILE_NAME = "result";
export const FILE_EXTENSION = "csv";
export const CSV_FILE_PATH = `./${FILE_NAME}.${FILE_EXTENSION}`;
export const CSV_HEADER =
	"URL,種別,影響度,ヘルプ,HTML要素,メッセージ,DOM要素\r";
export const CSV_TRANSLATE_RESULT_GROUPS: AxeResultsKeys[] = [
	"inapplicable",
	"violations",
	"incomplete",
	"passes",
];
export const CSV_TRANSLATE_IMPACT_VALUE = {
	critical: "緊急 (Critical)",
	serious: "深刻 (Serious)",
	moderate: "普通 (Moderate)",
	minor: "軽微 (Minor)",
};

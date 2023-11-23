import type { AxeResults } from "axe-core";

export type AxeResultsKeys = keyof Omit<
	AxeResults,
	| "toolOptions"
	| "testEngine"
	| "testRunner"
	| "testEnvironment"
	| "url"
	| "timestamp"
>;

## インストール

```
npm install
```

## 実行

```
npm run test
```

実行後 result.csv が出力される。

## テスト結果の内容

- URL … 問題が検出されたページの URL
- Violation Type … 検出された問題の種別。詳細は「Messages」に記載
- Impact … 検出された問題の重要度  
  - critical (緊急) 
  - serious (深刻) 
  - moderate (普通)
  - minor (軽微)
- Help … ヘルプ (Deque University の解説ページ) へのリンク
- HTML Element … 検出された問題の HTML 要素
- Messages … 検出された問題の詳細。日本語で記述されている
- DOM Element … 検出された問題の DOM 要素

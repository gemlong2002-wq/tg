# tg(手寫黑板)執行紅線
- 鐵律0:禁止 Code 自行決定 git push。唯一例外:Boss 在 Code 視窗明確下達「push」指令時,可代為執行 git push origin main。不得 force push、不得推其他分支、不得推其他 repo。commit 完就停,等 Boss 下令。
- 鐵律1:禁止部署、禁止操作 GAS 後台。可在 repo 內撰寫 gas/ 原始碼檔,部署一律由 Boss 本人手動貼上執行。
- 鐵律2:任何密碼/通關碼/金鑰的「值」不得寫入 repo、log、回報。只可記錄 key 名稱。
- 鐵律3:commit 前派一個 fresh-context 獨立 agent 依 Task 驗證方式驗收,通過才 commit。
- 鐵律4:一律用 repo 相對路徑,不寫死絕對路徑(Boss 為 Windows + Mac 雙環境)。
- 鐵律5:長輸出落檔 _handoff/<任務名>-dump.md,回報完整相對路徑。

/**
 * グローバルティアダウン - テスト実行後のクリーンアップ
 */
async function globalTeardown() {
  console.log('🧹 グローバルクリーンアップ開始');
  
  // テスト実行後のリソースクリーンアップ
  // 必要に応じてテストデータの削除などを実行
  
  console.log('✅ グローバルクリーンアップ完了');
}

export default globalTeardown;
import { t, tr, useLocale } from '../i18n';
import { useState, useSyncExternalStore } from 'react';
import { applyUpdate, subscribeUpdate, updateAvailable } from '../siteCache';

export function UpdateNotice() {
  useLocale();
  const available = useSyncExternalStore(subscribeUpdate, updateAvailable, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  if (!available || dismissed) return null;
  return <aside className="update-notice" role="status" aria-label={t("版本更新")}>
    <span>{t("新版本已备好")}</span>
    <button disabled={refreshing} onClick={() => { setRefreshing(true); applyUpdate(); }}>{tr(refreshing ? '正在刷新…' : '刷新')}</button>
    <button disabled={refreshing} onClick={() => setDismissed(true)}>{t("稍后")}</button>
  </aside>;
}

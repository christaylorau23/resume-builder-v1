/**
 * Settings: Target Market (US/AU).
 * Target market is stored in localStorage; used to resolve identity phone for redraft.
 */
import {
  STORAGE_KEYS,
  PHONE_BY_MARKET,
  DEFAULT_TARGET_MARKET,
  type TargetMarket,
} from './constants';

export function getTargetMarket(): TargetMarket {
  const v = localStorage.getItem(STORAGE_KEYS.TARGET_MARKET);
  if (v === 'US' || v === 'AU') return v;
  return DEFAULT_TARGET_MARKET;
}

export function setTargetMarket(market: TargetMarket): void {
  localStorage.setItem(STORAGE_KEYS.TARGET_MARKET, market);
}

/** Phone number for the current target market (for redraft request context). */
export function getProfilePhone(): string {
  return PHONE_BY_MARKET[getTargetMarket()];
}

/** Returns HTML for the Settings section: Target Market toggle. */
export function renderSettings(): string {
  const market = getTargetMarket();
  return `
    <section class="settings card" aria-label="Settings">
      <h2>Settings</h2>
      <div class="setting-group">
        <label for="target-market">Target Market</label>
        <div class="target-market-toggle" role="group" aria-label="Target market">
          <button type="button" class="toggle-btn ${market === 'US' ? 'active' : ''}" data-market="US" aria-pressed="${market === 'US'}">US 🇺🇸</button>
          <button type="button" class="toggle-btn ${market === 'AU' ? 'active' : ''}" data-market="AU" aria-pressed="${market === 'AU'}">AU 🇦🇺</button>
        </div>
        <p class="setting-hint">Phone used in resume: ${PHONE_BY_MARKET[market]}</p>
      </div>
    </section>
  `;
}

/** Attach event listeners for Target Market toggle. */
export function attachSettingsListeners(root: Document | DocumentFragment | Element): void {
  root.querySelectorAll('.toggle-btn[data-market]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const market = (btn as HTMLElement).dataset.market as TargetMarket;
      if (market !== 'US' && market !== 'AU') return;
      setTargetMarket(market);
      root.querySelectorAll('.toggle-btn[data-market]').forEach((b) => {
        (b as HTMLButtonElement).setAttribute('aria-pressed', (b as HTMLElement).dataset.market === market ? 'true' : 'false');
        b.classList.toggle('active', (b as HTMLElement).dataset.market === market);
      });
      const hint = root.querySelector('.setting-group .setting-hint');
      if (hint) hint.textContent = `Phone used in resume: ${PHONE_BY_MARKET[market]}`;
    });
  });
}

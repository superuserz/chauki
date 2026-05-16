import { useTranslation } from 'react-i18next';
import { useStatsStore } from '@/stores/statsStore';
import type { Language } from '@/types/api';

export function Stats() {
  const { t } = useTranslation();
  const stats = useStatsStore();
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <h1 className="text-2xl font-semibold">{t('stats.title')}</h1>
      <LangBlock lang="hi" data={stats.hi} />
      <LangBlock lang="en" data={stats.en} />
    </div>
  );
}

function LangBlock({
  lang,
  data,
}: {
  lang: Language;
  data: ReturnType<typeof useStatsStore.getState>['hi'];
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border border-bg-panel p-4">
      <h2 className="text-sm uppercase opacity-70">{lang === 'hi' ? 'हिन्दी' : 'English'}</h2>
      <div className="mt-3 grid grid-cols-4 gap-3 text-center">
        <Stat label={t('stats.currentStreak')} value={data.dailyCurrentStreak} />
        <Stat label={t('stats.maxStreak')} value={data.dailyMaxStreak} />
        <Stat label={t('stats.dailyWins')} value={data.dailyWins} />
        <Stat label={t('stats.dailyPlayed')} value={data.dailyPlayed} />
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase opacity-60">{t('stats.distribution')}</p>
        <div className="mt-2 flex flex-col gap-1">
          {data.dailyDistribution.map((count, i) => {
            const max = Math.max(1, ...data.dailyDistribution);
            const pct = Math.round((count / max) * 100);
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-4 opacity-60">{i + 1}</span>
                <div className="h-4 flex-1 rounded bg-bg-panel">
                  <div
                    className="h-full rounded bg-tile-correct text-right pr-1"
                    style={{ width: `${pct}%` }}
                  >
                    {count > 0 ? count : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <Stat label={t('stats.practiceWins')} value={data.practiceWins} />
        <Stat label={t('stats.practicePlayed')} value={data.practicePlayed} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase opacity-60">{label}</p>
    </div>
  );
}

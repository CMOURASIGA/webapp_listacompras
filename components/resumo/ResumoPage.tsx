import React from 'react';
import MonthlyOverviewCard, { MonthlyOverview } from './MonthlyOverviewCard';
import TopCategoriesCard, { TopCategoryData } from './TopCategoriesCard';
import FrequentItemsCard, { FrequentItemData } from './FrequentItemsCard';
import QuickActionsCard from './QuickActionsCard';
import AIInsightsPlaceholderCard from './AIInsightsPlaceholderCard';

interface ResumoPageProps {
  loading: boolean;
  monthLabel: string;
  monthlyOverview: MonthlyOverview;
  topCategories: TopCategoryData[];
  frequentItems: FrequentItemData[];
  lastPurchase: { id: string | number; data: string } | null;
  showAIInsights: boolean;
  onRepeatLastPurchase: () => void;
  onGenerateListWithAI: () => void;
  onCreateNewList: () => void;
}

export default function ResumoPage({
  loading,
  monthLabel,
  monthlyOverview,
  topCategories,
  frequentItems,
  lastPurchase,
  showAIInsights,
  onRepeatLastPurchase,
  onGenerateListWithAI,
  onCreateNewList
}: ResumoPageProps) {
  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      <MonthlyOverviewCard monthLabel={monthLabel} overview={monthlyOverview} loading={loading} />
      <TopCategoriesCard categories={topCategories} loading={loading} />
      <FrequentItemsCard items={frequentItems} loading={loading} />
      <QuickActionsCard
        loading={loading}
        lastPurchase={lastPurchase}
        onRepeatLastPurchase={onRepeatLastPurchase}
        onGenerateListWithAI={onGenerateListWithAI}
        onCreateNewList={onCreateNewList}
      />
      {showAIInsights && <AIInsightsPlaceholderCard loading={loading} />}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface CardListProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
}

const CardList = <T,>({ items, renderCard }: CardListProps<T>) => {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(36);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, items.length));
  }, [items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) loadMore();
      },
      { threshold: 1.0 }
    );
    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);
    return () => { if (currentSentinel) observer.unobserve(currentSentinel); };
  }, [visibleCount, items.length, loadMore]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {items.slice(0, visibleCount).map((item, index) => (
          <div key={index} className="w-full">
            {renderCard(item, index)}
          </div>
        ))}
      </div>

      {visibleCount < items.length && (
        <div
          ref={sentinelRef}
          className="w-full text-center h-[var(--size-lg)] text-[var(--size-smm)] text-[var(--white-60)]"
        >
          {t("common.loading")}
        </div>
      )}
    </div>
  );
};

export default CardList;

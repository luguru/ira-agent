export const REPORT_JS = `(() => {
  const viewportSelect = document.getElementById('finding-filter-viewport');
  const statusSelect = document.getElementById('finding-filter-status');
  const impactSelect = document.getElementById('finding-filter-impact');
  const resetButton = document.getElementById('finding-filter-reset');
  const countNode = document.getElementById('finding-count');
  const cards = Array.from(document.querySelectorAll('.finding-card'));

  if (!viewportSelect || !statusSelect || !impactSelect || !countNode || cards.length === 0) {
    return;
  }

  const formatCount = (visible, total) => {
    return visible === total
      ? 'Mostrando ' + total + ' incidencias'
      : 'Mostrando ' + visible + ' de ' + total + ' incidencias';
  };

  const applyFilters = () => {
    const viewport = viewportSelect.value;
    const status = statusSelect.value;
    const impact = impactSelect.value;

    let visibleCount = 0;

    for (const card of cards) {
      const cardViewport = card.getAttribute('data-viewport') || '';
      const cardStatus = card.getAttribute('data-status') || '';
      const cardImpact = card.getAttribute('data-impact') || '';

      const matchesViewport = viewport === 'all' || cardViewport === viewport;
      const matchesStatus = status === 'all' || cardStatus === status;
      const matchesImpact = impact === 'all' || cardImpact === impact;
      const isVisible = matchesViewport && matchesStatus && matchesImpact;

      card.classList.toggle('is-hidden', !isVisible);
      card.setAttribute('aria-hidden', isVisible ? 'false' : 'true');

      if (isVisible) {
        visibleCount += 1;
      }
    }

    countNode.textContent = formatCount(visibleCount, cards.length);
  };

  const resetFilters = () => {
    viewportSelect.value = 'all';
    statusSelect.value = 'all';
    impactSelect.value = 'all';
    applyFilters();
  };

  viewportSelect.addEventListener('change', applyFilters);
  statusSelect.addEventListener('change', applyFilters);
  impactSelect.addEventListener('change', applyFilters);

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }

  applyFilters();
})();
`;

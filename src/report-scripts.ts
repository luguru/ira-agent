export const REPORT_JS = `(() => {
  const STORAGE_KEY = 'ira-report-edits:' + window.location.pathname;
  const viewportSelect = document.getElementById('finding-filter-viewport');
  const statusSelect = document.getElementById('finding-filter-status');
  const impactSelect = document.getElementById('finding-filter-impact');
  const resetButton = document.getElementById('finding-filter-reset');
  const countNode = document.getElementById('finding-count');
  const cards = Array.from(document.querySelectorAll('.finding-card'));

  if (!viewportSelect || !statusSelect || !impactSelect || !countNode || cards.length === 0) {
    return;
  }

  const persistedEdits = loadEdits();

  const formatCount = (visible, total) => {
    return visible === total
      ? 'Mostrando ' + total + ' incidencias'
      : 'Mostrando ' + visible + ' de ' + total + ' incidencias';
  };

  const getCardId = (card) => card.getAttribute('data-incident-id') || '';

  const saveEdits = () => {
    const snapshot = {};

    for (const card of cards) {
      const cardId = getCardId(card);

      if (!cardId) {
        continue;
      }

      const statusInput = card.querySelector('[data-field="workflow-status"]');
      const ownerInput = card.querySelector('[data-field="owner"]');
      const validationInput = card.querySelector('[data-field="validation-date"]');

      snapshot[cardId] = {
        workflowStatus: statusInput ? statusInput.value : '',
        owner: ownerInput ? ownerInput.value : '',
        validationDate: validationInput ? validationInput.value : '',
      };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignora errores de almacenamiento para no romper la navegación del reporte.
    }
  };

  const syncCardState = (card) => {
    const statusInput = card.querySelector('[data-field="workflow-status"]');

    if (!statusInput) {
      return;
    }

    card.setAttribute('data-workflow-status', statusInput.value);

    const iconNode = card.querySelector('[data-role="status-icon"]');

    if (iconNode) {
      iconNode.textContent = getStatusIcon(statusInput.value);
    }

    const statusLabelNode = card.querySelector('[data-role="workflow-status-label"]');

    if (statusLabelNode) {
      statusLabelNode.textContent = getStatusLabel(statusInput.value);
    }
  };

  const applyFilters = () => {
    const viewport = viewportSelect.value;
    const status = statusSelect.value;
    const impact = impactSelect.value;

    let visibleCount = 0;

    for (const card of cards) {
      const cardViewport = card.getAttribute('data-viewport') || '';
      const cardStatus = card.getAttribute('data-workflow-status') || '';
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

  const applyPersistedValues = () => {
    for (const card of cards) {
      const cardId = getCardId(card);

      if (!cardId) {
        continue;
      }

      const saved = persistedEdits[cardId];

      if (!saved) {
        syncCardState(card);
        continue;
      }

      const statusInput = card.querySelector('[data-field="workflow-status"]');
      const ownerInput = card.querySelector('[data-field="owner"]');
      const validationInput = card.querySelector('[data-field="validation-date"]');

      if (statusInput && saved.workflowStatus) {
        statusInput.value = saved.workflowStatus;
      }

      if (ownerInput && saved.owner) {
        ownerInput.value = saved.owner;
      }

      if (validationInput && saved.validationDate) {
        validationInput.value = saved.validationDate;
      }

      syncCardState(card);
    }
  };

  const wireCardInputs = () => {
    for (const card of cards) {
      const editableInputs = card.querySelectorAll('[data-field]');

      for (const input of editableInputs) {
        input.addEventListener('change', () => {
          syncCardState(card);
          saveEdits();
          applyFilters();
        });
      }
    }
  };

  const wireAccordions = () => {
    for (const card of cards) {
      const head = card.querySelector('.finding-head');
      const toggle = card.querySelector('[data-role="accordion-toggle"]');
      const panelId = toggle ? toggle.getAttribute('aria-controls') : '';
      const panel = panelId ? document.getElementById(panelId) : null;

      if (!toggle || !panel) {
        continue;
      }

      const applyAccordionState = (expanded) => {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        panel.hidden = !expanded;
        card.classList.toggle('is-open', expanded);
      };

      const onToggle = () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        applyAccordionState(!expanded);
      };

      toggle.addEventListener('click', onToggle);

      // Fallback: si algun navegador no propaga bien eventos del button,
      // habilitamos click en toda la cabecera excepto controles editables.
      if (head) {
        head.addEventListener('click', (event) => {
          const target = event.target;

          if (!(target instanceof Element)) {
            return;
          }

          if (target.closest('select, input, label.finding-head-status, [data-field]')) {
            return;
          }

          if (target.closest('[data-role="accordion-toggle"]')) {
            return;
          }

          onToggle();
        });
      }
    }
  };

  viewportSelect.addEventListener('change', applyFilters);
  statusSelect.addEventListener('change', applyFilters);
  impactSelect.addEventListener('change', applyFilters);

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }

  wireCardInputs();
  wireAccordions();
  applyPersistedValues();
  applyFilters();

  function loadEdits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);

      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function getStatusIcon(status) {
    const iconMap = {
      nuevo: '◎',
      confirmado: '◆',
      'pendiente-correccion': '⧖',
      'en-curso': '⟳',
      corregido: '☑',
      validado: '✔',
      reabierto: '↻',
      'aceptado-riesgo': '⚠',
      'no-aplica': '⊘',
      duplicado: '⧉',
    };

    return iconMap[status] || '•';
  }

  function getStatusLabel(status) {
    const labelMap = {
      nuevo: 'Nuevo',
      confirmado: 'Confirmado',
      'pendiente-correccion': 'Pendiente de corrección',
      'en-curso': 'En curso',
      corregido: 'Corregido',
      validado: 'Validado',
      reabierto: 'Reabierto',
      'aceptado-riesgo': 'Aceptado con riesgo',
      'no-aplica': 'No aplica',
      duplicado: 'Duplicado',
    };

    return labelMap[status] || 'Estado';
  }
})();
`;

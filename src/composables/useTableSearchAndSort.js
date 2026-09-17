import { reactive, computed, unref } from 'vue';

export function useTableSearchAndSort(dataArrayRef) {
  const state = reactive({
    searchQuery: '',
    sortKey: '',
    sortAsc: true
  });

  const processedData = computed(() => {
    const rawData = unref(dataArrayRef);
    let result = Array.isArray(rawData) ? [...rawData] : [];

    // Global Search Filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter((item) => {
        if (!item) return false;
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Sort
    if (state.sortKey) {
      result.sort((a, b) => {
        let valA = a[state.sortKey];
        let valB = b[state.sortKey];
        
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return state.sortAsc ? -1 : 1;
        if (valA > valB) return state.sortAsc ? 1 : -1;
        return 0;
      });
    }

    return result;
  });

  const toggleSort = (key) => {
    if (state.sortKey === key) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortKey = key;
      state.sortAsc = true;
    }
  };

  return reactive({
    searchQuery: computed({
      get: () => state.searchQuery,
      set: (val) => { state.searchQuery = val; }
    }),
    sortKey: computed(() => state.sortKey),
    sortAsc: computed(() => state.sortAsc),
    processedData,
    toggleSort
  });
}

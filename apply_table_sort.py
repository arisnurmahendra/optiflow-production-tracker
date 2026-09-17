import re

def process_app_vue():
    with open('src/App.vue', 'r', encoding='utf-8') as f:
        content = f.read()

    if 'useTableSearchAndSort' not in content:
        content = content.replace(
            "import { useOperatorReportStore } from './composables/useOperatorReportStore.js';",
            "import { useOperatorReportStore } from './composables/useOperatorReportStore.js';\nimport { useTableSearchAndSort } from './composables/useTableSearchAndSort.js';"
        )
        
        # Inject script setup initializations before </script>
        script_setup_end_idx = content.rfind('</script>')
        init_code = """
// --- Table Search & Sort Managers ---
const tblDefectOptions = useTableSearchAndSort(defectOptions);
const tblSupervisorRawRows = useTableSearchAndSort(supervisorRawRows);
const tblProductionTargetRows = useTableSearchAndSort(productionTargetRows);
const tblSupervisorQuarantineRows = useTableSearchAndSort(supervisorQuarantineRows);
const tblBagianMasterRows = useTableSearchAndSort(bagianMasterRows);
const tblDashboardPareto = useTableSearchAndSort(computed(() => dashboardData.value?.pareto || []));
const tblHrdVisibleEmployees = useTableSearchAndSort(hrdVisibleEmployees); // Already filtered, applying sort on top
const tblHrdAttendanceDailyRows = useTableSearchAndSort(hrdAttendanceDailyRows);
const tblHrdAttendanceMonthlyRows = useTableSearchAndSort(hrdAttendanceMonthlyRows);
const tblMaintenanceProperties = useTableSearchAndSort(maintenanceProperties);
"""
        content = content[:script_setup_end_idx] + init_code + content[script_setup_end_idx:]

    with open('src/App.vue', 'w', encoding='utf-8') as f:
        f.write(content)

process_app_vue()
print("Success")

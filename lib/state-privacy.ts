type DemoEmployee = { slug: string; name: string; role: string };

const withoutPrivateFields = <T extends Record<string, unknown>>(record: T) => {
  const {
    originating_chat_id: _originatingChatId,
    notification_error: _notificationError,
    sheet_sync_error: _sheetSyncError,
    ...safe
  } = record;
  return safe;
};

export function employeeState(employee: DemoEmployee, sales: Record<string, unknown>[], expenses: Record<string, unknown>[]) {
  const actor = { slug: employee.slug, name: employee.name, role: employee.role };
  if (employee.role === "salesperson") {
    return {
      actor,
      sales: sales.filter((sale) => sale.salesperson === employee.slug).map(withoutPrivateFields),
      expenses: [],
      employees: [],
      dashboard: null,
    };
  }
  if (employee.role === "expense_reporter") {
    return {
      actor,
      sales: [],
      expenses: expenses.filter((expense) => expense.reporter === employee.slug).map(withoutPrivateFields),
      employees: [],
      dashboard: null,
    };
  }
  throw new Error("Manager state must be assembled separately.");
}

/**
 * Enterprise DataTable — built on TanStack Table v8
 * Replaces all 17 manual table implementations in the codebase.
 * Features: sorting, column filters, pagination, row selection, column visibility,
 *           bulk actions, export CSV, skeleton loading, empty state.
 */
import React, { useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Download, Settings2,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
} from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BulkAction<T> {
  label:   string;
  icon?:   React.ReactNode;
  variant?: 'primary' | 'danger' | 'secondary';
  action:  (selectedRows: T[]) => void;
}

interface DataTableProps<T extends object> {
  data:                  T[];
  columns:               ColumnDef<T, any>[];
  loading?:              boolean;
  // Feature flags
  enableSorting?:        boolean;
  enableFiltering?:      boolean;
  enablePagination?:     boolean;
  enableRowSelection?:   boolean;
  enableColumnVisibility?: boolean;
  enableExport?:         boolean;
  // Config
  defaultPageSize?:      number;
  pageSizeOptions?:      number[];
  onRowClick?:           (row: T) => void;
  bulkActions?:          BulkAction<T>[];
  getRowId?:             (row: T) => string;
  emptyTitle?:           string;
  emptyDescription?:     string;
  emptyAction?:          { label: string; onClick: () => void; icon?: React.ReactNode };
  className?:            string;
  // Global search
  searchPlaceholder?:    string;
  searchValue?:          string;
  onSearchChange?:       (v: string) => void;
  // Export
  exportFilename?:       string;
}

// ─── CSV export helper ────────────────────────────────────────────────────────
function exportToCSV<T>(data: T[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0] as object);
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const val = (row as any)[k];
      if (val == null) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DataTable<T extends object>({
  data,
  columns,
  loading               = false,
  enableSorting         = true,
  enableFiltering       = true,
  enablePagination      = true,
  enableRowSelection    = false,
  enableColumnVisibility = false,
  enableExport          = false,
  defaultPageSize       = 20,
  pageSizeOptions       = [10, 20, 50, 100],
  onRowClick,
  bulkActions           = [],
  getRowId,
  emptyTitle            = 'No results found',
  emptyDescription      = 'Try adjusting your filters or search term.',
  emptyAction,
  className             = '',
  searchPlaceholder     = 'Search…',
  searchValue,
  onSearchChange,
  exportFilename        = 'export',
}: DataTableProps<T>) {
  const [sorting,         setSorting]         = useState<SortingState>([]);
  const [columnFilters,   setColumnFilters]   = useState<ColumnFiltersState>([]);
  const [columnVisibility,setColumnVisibility]= useState<VisibilityState>({});
  const [rowSelection,    setRowSelection]    = useState<RowSelectionState>({});
  const [pagination,      setPagination]      = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize });
  const [globalFilter,    setGlobalFilter]    = useState(searchValue ?? '');
  const [showColumnMenu,  setShowColumnMenu]  = useState(false);

  // Sync external search
  useEffect(() => {
    if (searchValue !== undefined) setGlobalFilter(searchValue);
  }, [searchValue]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination, globalFilter },
    onSortingChange:          setSorting,
    onColumnFiltersChange:    setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange:     setRowSelection,
    onPaginationChange:       setPagination,
    onGlobalFilterChange:     v => {
      setGlobalFilter(v);
      onSearchChange?.(v);
    },
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     enableSorting    ? getSortedRowModel()     : undefined,
    getFilteredRowModel:   enableFiltering  ? getFilteredRowModel()   : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    enableRowSelection,
    getRowId,
    manualPagination: false,
  });

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
  const hasSelection = selectedRows.length > 0;

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows    = table.getFilteredRowModel().rows.length;
  const startRow     = enablePagination ? pageIndex * pageSize + 1 : 1;
  const endRow       = enablePagination ? Math.min(startRow + pageSize - 1, totalRows) : totalRows;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Global search */}
        {enableFiltering && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={globalFilter}
              onChange={e => {
                setGlobalFilter(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder={searchPlaceholder}
              aria-label="Search table"
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-btn focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 placeholder:dark:text-slate-400"
            />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Column visibility */}
          {enableColumnVisibility && (
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Settings2 className="w-4 h-4" />}
                onClick={() => setShowColumnMenu(v => !v)}
              >
                Columns
              </Button>
              {showColumnMenu && (
                <div className="absolute right-0 top-9 z-30 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-card shadow-card-md p-3 min-w-[180px] animate-slide-down">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-2 px-1">Toggle columns</p>
                  {table.getAllLeafColumns().filter(c => c.id !== 'select' && c.id !== 'actions').map(col => (
                    <label key={col.id} className="flex items-center gap-2 px-1 py-1 hover:bg-surface-subtle dark:hover:bg-slate-700 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="accent-primary-600"
                      />
                      <span className="dark:text-slate-200">{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Export */}
          {enableExport && (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download className="w-4 h-4" />}
              onClick={() => exportToCSV(data, exportFilename)}
            >
              Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-card border border-surface-border dark:border-slate-700 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-border dark:divide-slate-700" role="grid">
            <thead className="bg-surface-subtle dark:bg-slate-700/50">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={[
                        'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap',
                        header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-white group' : '',
                      ].join(' ')}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'  ? 'ascending'  :
                        header.column.getIsSorted() === 'desc' ? 'descending' : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-gray-300 dark:text-slate-500 group-hover:text-gray-400 dark:group-hover:text-slate-400">
                              {header.column.getIsSorted() === 'asc'  ? <ChevronUp className="w-3.5 h-3.5 text-primary-600" /> :
                               header.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-primary-600" /> :
                               <ChevronsUpDown className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {loading ? (
              <TableSkeleton rows={defaultPageSize > 10 ? 8 : defaultPageSize} cols={columns.length} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-surface-border dark:divide-slate-700 bg-white dark:bg-slate-800">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={[
                      'transition-colors duration-100',
                      row.getIsSelected() ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-muted dark:hover:bg-slate-700/50',
                      onRowClick ? 'cursor-pointer' : '',
                    ].join(' ')}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* ── Pagination ── */}
        {enablePagination && !loading && totalRows > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border dark:border-slate-700 bg-surface-muted dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Showing <span className="font-medium text-gray-700 dark:text-slate-200">{startRow}–{endRow}</span> of{' '}
                <span className="font-medium text-gray-700 dark:text-slate-200">{totalRows}</span> results
              </p>
              <select
                value={pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="text-xs border border-surface-border dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map(s => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => table.setPageIndex(0)}          disabled={!table.getCanPreviousPage()} aria-label="First page"    className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft  className="w-4 h-4" /></button>
              <button onClick={() => table.previousPage()}           disabled={!table.getCanPreviousPage()} aria-label="Previous page"  className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft   className="w-4 h-4" /></button>
              <span className="text-xs text-gray-600 dark:text-slate-300 px-2 font-medium">
                {pageIndex + 1} / {table.getPageCount()}
              </span>
              <button onClick={() => table.nextPage()}               disabled={!table.getCanNextPage()}     aria-label="Next page"      className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight  className="w-4 h-4" /></button>
              <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page" className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {enableRowSelection && hasSelection && bulkActions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-full shadow-modal animate-slide-up">
          <span className="text-sm font-semibold mr-2">{selectedRows.length} selected</span>
          {bulkActions.map((a, i) => (
            <button
              key={i}
              onClick={() => a.action(selectedRows)}
              className={[
                'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors',
                a.variant === 'danger'
                  ? 'bg-danger-600 hover:bg-danger-700 text-white'
                  : 'bg-white/10 hover:bg-white/20',
              ].join(' ')}
            >
              {a.icon && <span className="w-4 h-4">{a.icon}</span>}
              {a.label}
            </button>
          ))}
          <button
            onClick={() => setRowSelection({})}
            className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Column helpers ───────────────────────────────────────────────────────────
/** Checkbox column for row selection — add as first column */
export function createSelectColumn<T>(): ColumnDef<T, any> {
  return {
    id:     'select',
    size:   40,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all rows"
        className="accent-primary-600 w-4 h-4 cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={e => e.stopPropagation()}
        aria-label="Select row"
        className="accent-primary-600 w-4 h-4 cursor-pointer"
      />
    ),
  };
}

export default DataTable;

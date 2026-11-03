
import { Search, Filter, X } from "lucide-react";

const PRIORITIES = ["low", "medium", "high"];

const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function BoardFilters({
  search,
  onSearchChange,
  selectedPriorities,
  onPriorityChange,
  selectedColumns,
  onColumnChange,
  onClear,
}) {
  const hasFilters =
    search.trim() ||
    selectedPriorities.length > 0 ||
    selectedColumns.length > 0;

  return (
    <section className="board-filters">
      <div className="search-box">
        <Search size={17} />

        <input
          type="search"
          placeholder="Search tasks by title or description..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search tasks"
        />
      </div>

      <div className="filter-group">
        <div className="filter-label">
          <Filter size={15} />
          Priority
        </div>

        <div className="filter-options">
          {PRIORITIES.map((priority) => (
            <label className="filter-option" key={priority}>
              <input
                type="checkbox"
                checked={selectedPriorities.includes(priority)}
                onChange={() => onPriorityChange(priority)}
              />
              <span>{priority}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-label">Column</div>

        <div className="filter-options">
          {COLUMNS.map((column) => (
            <label className="filter-option" key={column.id}>
              <input
                type="checkbox"
                checked={selectedColumns.includes(column.id)}
                onChange={() => onColumnChange(column.id)}
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          className="clear-filters-button"
          onClick={onClear}
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </section>
  );
}

export default BoardFilters;


import { useState } from "react";
import { X } from "lucide-react";

function TaskForm({ onClose, onSubmit, initialTask = null }) {
  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(
    initialTask?.description || ""
  );
  const [priority, setPriority] = useState(
    initialTask?.priority || "medium"
  );
  const [tags, setTags] = useState(
    initialTask?.tags?.join(", ") || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        ...(initialTask ? {} : { columnId: "todo" }),
      });

      onClose();
    } catch (error) {
      console.error("Task submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="task-modal-title">
              {initialTask ? "Edit task" : "Create a task"}
            </h2>
            <p>
              {initialTask
                ? "Update your task details."
                : "Add a new task to your workspace."}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Implement authentication"
            maxLength={120}
            required
            autoFocus
          />

          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What needs to be done?"
            rows={4}
            maxLength={2000}
          />

          <label htmlFor="task-priority">Priority</label>
          <select
            id="task-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label htmlFor="task-tags">Tags</label>
          <input
            id="task-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="frontend, backend, design"
          />

          <footer className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-primary"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting
                ? "Saving..."
                : initialTask
                  ? "Save changes"
                  : "Create task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TaskForm;

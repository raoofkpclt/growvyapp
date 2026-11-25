

import { auth } from "../../config/firebase/firebase";
import TasksPanel from "../admin/TasksPanel";

const TaskManagement = () => {
  const viewer = { uid: auth.currentUser?.uid ?? "admin", name: "Admin" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Task Management</h2>
        <p className="text-sm text-zinc-500">
          Assign work, track progress and approve completed tasks.
        </p>
      </div>

      {/* isAdmin: the admin can approve any task */}
      <TasksPanel viewer={viewer} scope="all" canAssign canFeedback isAdmin />
    </div>
  );
};

export default TaskManagement;
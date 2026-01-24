"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function CreateAttendancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    user_id: "",
    date: "",
    clock_in_time: "",
    clock_out_time: "",
    status: "present",
    notes: "",
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://api.stg.trywiguna.xyz/api/v1/users?role=staff",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.date) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: formData.user_id,
            date: formData.date,
            clock_in_time: formData.clock_in_time
              ? `${formData.date} ${formData.clock_in_time}:00`
              : null,
            clock_out_time: formData.clock_out_time
              ? `${formData.date} ${formData.clock_out_time}:00`
              : null,
            status: formData.status,
            notes: formData.notes,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Attendance record created successfully!");
        setFormData({
          user_id: "",
          date: "",
          clock_in_time: "",
          clock_out_time: "",
          status: "present",
          notes: "",
        });
        setTimeout(() => router.push("/admin/attendance"), 2000);
      } else {
        setError("Failed to create attendance record");
      }
    } catch (err) {
      console.error("Error creating attendance:", err);
      setError("Failed to create attendance record");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-3xl font-bold mb-6">Create Attendance Record</h1>

      <Button
        onClick={() => router.push("/admin/attendance")}
        className="mb-6 bg-gray-600 hover:bg-gray-700"
      >
        ← Back to Attendance
      </Button>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-4 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.user_id}
            onChange={(e) =>
              setFormData({
                ...formData,
                user_id: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select an employee</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) =>
              setFormData({
                ...formData,
                date: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clock In Time
          </label>
          <input
            type="time"
            value={formData.clock_in_time}
            onChange={(e) =>
              setFormData({
                ...formData,
                clock_in_time: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clock Out Time
          </label>
          <input
            type="time"
            value={formData.clock_out_time}
            onChange={(e) =>
              setFormData({
                ...formData,
                clock_out_time: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
            <option value="late">Late</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({
                ...formData,
                notes: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2 h-20"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Creating..." : "Create Record"}
        </Button>
      </form>
    </div>
  );
}

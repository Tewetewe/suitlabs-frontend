"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/date";

interface TimeOffRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  time_off_type: string;
  reason: string;
  status: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export default function TimeOffRequestPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    time_off_type: "leave",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  const fetchRequests = async () => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/time-off-requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to fetch time off requests");
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to fetch time off requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date || !formData.reason) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setError("");
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/time-off-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            start_date: formData.start_date,
            end_date: formData.end_date,
            time_off_type: formData.time_off_type,
            reason: formData.reason,
          }),
        }
      );

      if (response.ok) {
        const newRequest = await response.json();
        setRequests([newRequest, ...requests]);
        setFormData({
          start_date: "",
          end_date: "",
          time_off_type: "leave",
          reason: "",
        });
      } else {
        setError("Failed to submit time off request");
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      setError("Failed to submit time off request");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Time Off Requests</h1>

      <Button
        onClick={() => router.push("/attendance")}
        className="mb-6 bg-gray-600 hover:bg-gray-700"
      >
        ← Back to Attendance
      </Button>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">New Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_date: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.time_off_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time_off_type: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="leave">Leave</option>
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reason: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2 h-20"
                  placeholder="Please provide a reason"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </div>
        </div>

        {/* Requests List */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">My Requests</h2>
          {loading ? (
            <div>Loading...</div>
          ) : requests.length > 0 ? (
            <div className="grid gap-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        {formatDate(req.start_date)} - {formatDate(req.end_date)}
                      </p>
                      <p className="font-semibold capitalize">{req.time_off_type}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-white text-xs font-semibold ${
                        req.status === "pending"
                          ? "bg-yellow-600"
                          : req.status === "approved"
                            ? "bg-green-600"
                            : "bg-red-600"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{req.reason}</p>

                  {req.status === "rejected" && req.rejection_reason && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Rejection reason: {req.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No time off requests yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
